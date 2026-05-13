import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { PomodoroSettings, PomodoroState } from '../types';
import { useTimerContext } from './TimerContext';
import { playSound } from '../utils/sound';
import { loadPomodoroSettings, savePomodoroSettings } from '../utils/storage';

type PomodoroStatus = 'idle' | 'working' | 'shortBreak' | 'longBreak';

type PomodoroAction =
  | { type: 'START'; payload: { status: PomodoroStatus; seconds: number; startedAt: number } }
  | { type: 'TICK'; payload: { remainingSeconds: number; totalElapsedSeconds: number; phase: PomodoroStatus; completedPomodoros: number } }
  | { type: 'RESET' }
  | { type: 'SET_COMPLETED'; payload: { count: number } };

interface PomodoroContextType {
  settings: PomodoroSettings;
  pomodoroState: PomodoroState;
  isRunning: boolean;
  updatePomodoroSettings: (settings: Partial<PomodoroSettings>) => Promise<void>;
  startWork: () => void;
  startShortBreak: () => void;
  startLongBreak: () => void;
  skip: () => void;
  reset: () => void;
}

const defaultSettings: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

interface PomodoroStateExtended extends PomodoroState {
  startedAt: number | null;
}

const initialStateExtended: PomodoroStateExtended = {
  status: 'idle',
  completedPomodoros: 0,
  remainingSeconds: 0,
  totalElapsedSeconds: 0,
  startedAt: null,
};

function pomodoroReducer(state: PomodoroStateExtended, action: PomodoroAction): PomodoroStateExtended {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: action.payload.status,
        remainingSeconds: action.payload.seconds,
        totalElapsedSeconds: 0,
        startedAt: action.payload.startedAt,
      };
    case 'TICK':
      return {
        ...state,
        remainingSeconds: action.payload.remainingSeconds,
        totalElapsedSeconds: action.payload.totalElapsedSeconds,
        status: action.payload.phase,
        completedPomodoros: action.payload.completedPomodoros,
      };
    case 'RESET':
      return { ...initialStateExtended };
    case 'SET_COMPLETED':
      return { ...state, completedPomodoros: action.payload.count };
    default:
      return state;
  }
}

const POMODORO_ID = 'pomodoro';

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { settings: appSettings } = useTimerContext();
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings);
  const [state, dispatch] = useReducer(pomodoroReducer, initialStateExtended);
  const statusRef = useRef<PomodoroStatus>('idle');
  const completedRef = useRef(0);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    completedRef.current = state.completedPomodoros;
  }, [state.completedPomodoros]);

  useEffect(() => {
    void loadPomodoroSettings().then(setSettings).catch(console.error);
  }, []);

  const playPomodoroSound = useCallback(
    (type: 'timerStart' | 'timerEnd') => {
      void playSound(type, appSettings.soundEnabled);
    },
    [appSettings.soundEnabled],
  );

  const showNotification = useCallback(
    async (title: string, body: string) => {
      if (!appSettings.notificationsEnabled) {
        return;
      }

      try {
        await invoke('send_notification', { title, body });
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
    },
    [appSettings.notificationsEnabled],
  );

  useEffect(() => {
    let unlistenTick: (() => void) | undefined;
    let unlistenTransition: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenTick = await listen('pomodoro:tick', (event) => {
        const payload = event.payload as Record<string, unknown>;
        if (payload.timerId !== POMODORO_ID) return;
        if (
          typeof payload.remainingSeconds !== 'number' ||
          typeof payload.totalElapsedSeconds !== 'number' ||
          typeof payload.completedPomodoros !== 'number' ||
          !['working', 'shortBreak', 'longBreak'].includes(payload.phase as string)
        ) {
          console.error('Invalid pomodoro:tick payload', payload);
          return;
        }
        dispatch({
          type: 'TICK',
          payload: {
            remainingSeconds: payload.remainingSeconds,
            totalElapsedSeconds: payload.totalElapsedSeconds,
            phase: payload.phase as PomodoroStatus,
            completedPomodoros: payload.completedPomodoros,
          },
        });
      });

      unlistenTransition = await listen('timer:transition', (event) => {
        const payload = event.payload as Record<string, unknown>;
        if (payload.timerId !== POMODORO_ID) return;
        if (payload.type !== 'phase_end') {
          return;
        }

        if (
          typeof payload.remainingSeconds === 'number' &&
          typeof payload.totalElapsedSeconds === 'number' &&
          typeof payload.completedPomodoros === 'number' &&
          ['working', 'shortBreak', 'longBreak'].includes(payload.phase as string)
        ) {
          dispatch({
            type: 'TICK',
            payload: {
              remainingSeconds: payload.remainingSeconds,
              totalElapsedSeconds: payload.totalElapsedSeconds,
              phase: payload.phase as PomodoroStatus,
              completedPomodoros: payload.completedPomodoros,
            },
          });
        }

        const previousPhase = statusRef.current;
        playPomodoroSound('timerEnd');

        if (previousPhase === 'working') {
          const newPhase = ['shortBreak', 'longBreak'].includes(payload.phase as string)
            ? (payload.phase as PomodoroStatus)
            : 'shortBreak';
          if (newPhase === 'longBreak') {
            void showNotification(
              t('pomodoro.notifications.workFinishedTitle'),
              t('pomodoro.notifications.longBreakBody'),
            );
          } else {
            void showNotification(
              t('pomodoro.notifications.workFinishedTitle'),
              t('pomodoro.notifications.shortBreakBody'),
            );
          }
        } else if (previousPhase === 'shortBreak') {
          void showNotification(
            t('pomodoro.notifications.breakFinishedTitle'),
            t('pomodoro.notifications.breakFinishedBody'),
          );
        } else if (previousPhase === 'longBreak') {
          void showNotification(
            t('pomodoro.notifications.longBreakFinishedTitle'),
            t('pomodoro.notifications.longBreakFinishedBody'),
          );
        }
      });
    };

    void setupListeners();

    return () => {
      if (unlistenTick) unlistenTick();
      if (unlistenTransition) unlistenTransition();
    };
  }, [playPomodoroSound, showNotification, t]);

  const updatePomodoroSettings = useCallback(
    async (newSettings: Partial<PomodoroSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      try {
        await savePomodoroSettings(updated);
      } catch {
        toast.error(t('common.saveFailed'));
      }
    },
    [settings, t],
  );

  const startWork = useCallback(() => {
    if (statusRef.current !== 'idle') return;
    const seconds = settingsRef.current.workMinutes * 60;
    const now = Date.now();

    invoke('timer_start', {
      id: POMODORO_ID,
      kind: { type: 'pomodoro', settings: settingsRef.current, phase: 'working' },
    })
      .then(() => {
        dispatch({ type: 'START', payload: { status: 'working', seconds, startedAt: now } });
        statusRef.current = 'working';
        playPomodoroSound('timerStart');
      })
      .catch((error) => console.error('Failed to start pomodoro:', error));
  }, [playPomodoroSound]);

  const startShortBreak = useCallback(() => {
    const seconds = settingsRef.current.shortBreakMinutes * 60;
    const now = Date.now();

    invoke('timer_start', {
      id: POMODORO_ID,
      kind: { type: 'pomodoro', settings: settingsRef.current, phase: 'shortBreak' },
    })
      .then(() => {
        dispatch({ type: 'START', payload: { status: 'shortBreak', seconds, startedAt: now } });
        statusRef.current = 'shortBreak';
        playPomodoroSound('timerStart');
      })
      .catch((error) => console.error('Failed to start short break:', error));
  }, [playPomodoroSound]);

  const startLongBreak = useCallback(() => {
    const seconds = settingsRef.current.longBreakMinutes * 60;
    const now = Date.now();

    invoke('timer_start', {
      id: POMODORO_ID,
      kind: { type: 'pomodoro', settings: settingsRef.current, phase: 'longBreak' },
    })
      .then(() => {
        dispatch({ type: 'START', payload: { status: 'longBreak', seconds, startedAt: now } });
        statusRef.current = 'longBreak';
        playPomodoroSound('timerStart');
      })
      .catch((error) => console.error('Failed to start long break:', error));
  }, [playPomodoroSound]);

  const skip = useCallback(() => {
    if (statusRef.current === 'idle') return;
    invoke('timer_skip', { id: POMODORO_ID }).catch((error) => console.error('Failed to skip phase:', error));
  }, []);

  const reset = useCallback(() => {
    invoke('timer_reset', { id: POMODORO_ID })
      .then(() => {
        dispatch({ type: 'RESET' });
        statusRef.current = 'idle';
      })
      .catch((error) => console.error('Failed to reset pomodoro:', error));
  }, []);

  const value = React.useMemo(
    () => ({
      settings,
      pomodoroState: {
        status: state.status,
        completedPomodoros: state.completedPomodoros,
        remainingSeconds: state.remainingSeconds,
        totalElapsedSeconds: state.totalElapsedSeconds,
      },
      isRunning: state.status !== 'idle',
      updatePomodoroSettings,
      startWork,
      startShortBreak,
      startLongBreak,
      skip,
      reset,
    }),
    [
      settings,
      state.status,
      state.completedPomodoros,
      state.remainingSeconds,
      state.totalElapsedSeconds,
      updatePomodoroSettings,
      startWork,
      startShortBreak,
      startLongBreak,
      skip,
      reset,
    ],
  );

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoroContext() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoroContext must be used within a PomodoroProvider');
  }

  return context;
}
