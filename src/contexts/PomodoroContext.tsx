import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { PomodoroSettings, PomodoroState } from '../types';
import { useTimerContext } from './TimerContext';
import { notify, playAlertSound } from '../utils/notification';
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
  const lastPhaseRef = useRef<PomodoroStatus>('idle');
  const completedRef = useRef(0);
  const settingsRef = useRef(settings);
  const appSettingsRef = useRef(appSettings);
  appSettingsRef.current = appSettings;
  const tRef = useRef(t);
  tRef.current = t;

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

        const previousPhase = ['working', 'shortBreak', 'longBreak'].includes(payload.previousPhase as string)
          ? (payload.previousPhase as PomodoroStatus)
          : lastPhaseRef.current;

        const isValidPayload =
          typeof payload.remainingSeconds === 'number' &&
          typeof payload.totalElapsedSeconds === 'number' &&
          typeof payload.completedPomodoros === 'number' &&
          ['working', 'shortBreak', 'longBreak'].includes(payload.phase as string);

        if (isValidPayload) {
          dispatch({
            type: 'TICK',
            payload: {
              remainingSeconds: payload.remainingSeconds as number,
              totalElapsedSeconds: payload.totalElapsedSeconds as number,
              phase: payload.phase as PomodoroStatus,
              completedPomodoros: payload.completedPomodoros as number,
            },
          });
          statusRef.current = payload.phase as PomodoroStatus;
          lastPhaseRef.current = payload.phase as PomodoroStatus;
        }

        const { notificationMode, soundEnabled } = appSettingsRef.current;

        if (previousPhase === 'working') {
          const newPhase = ['shortBreak', 'longBreak'].includes(payload.phase as string)
            ? (payload.phase as PomodoroStatus)
            : 'shortBreak';
          if (newPhase === 'longBreak') {
            void notify(
              tRef.current('pomodoro.notifications.workFinishedTitle'),
              tRef.current('pomodoro.notifications.longBreakBody'),
              notificationMode,
              'timerEnd',
              soundEnabled,
              appSettingsRef.current.notificationsEnabled,
            );
          } else {
            void notify(
              tRef.current('pomodoro.notifications.workFinishedTitle'),
              tRef.current('pomodoro.notifications.shortBreakBody'),
              notificationMode,
              'timerEnd',
              soundEnabled,
              appSettingsRef.current.notificationsEnabled,
            );
          }
        } else if (previousPhase === 'shortBreak') {
          void notify(
            tRef.current('pomodoro.notifications.breakFinishedTitle'),
            tRef.current('pomodoro.notifications.breakFinishedBody'),
            notificationMode,
            'timerEnd',
            soundEnabled,
            appSettingsRef.current.notificationsEnabled,
          );
        } else if (previousPhase === 'longBreak') {
          void notify(
            tRef.current('pomodoro.notifications.longBreakFinishedTitle'),
            tRef.current('pomodoro.notifications.longBreakFinishedBody'),
            notificationMode,
            'timerEnd',
            soundEnabled,
            appSettingsRef.current.notificationsEnabled,
          );
        }
      });
    };

    void setupListeners();

    return () => {
      if (unlistenTick) unlistenTick();
      if (unlistenTransition) unlistenTransition();
    };
  }, []);

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
        lastPhaseRef.current = 'working';
        void playAlertSound('timerStart', appSettingsRef.current.soundEnabled);
      })
      .catch((error) => console.error('Failed to start pomodoro:', error));
  }, []);

  const startShortBreak = useCallback(() => {
    if (statusRef.current !== 'idle') return;
    const seconds = settingsRef.current.shortBreakMinutes * 60;
    const now = Date.now();

    invoke('timer_start', {
      id: POMODORO_ID,
      kind: { type: 'pomodoro', settings: settingsRef.current, phase: 'shortBreak' },
    })
      .then(() => {
        dispatch({ type: 'START', payload: { status: 'shortBreak', seconds, startedAt: now } });
        statusRef.current = 'shortBreak';
        lastPhaseRef.current = 'shortBreak';
        void playAlertSound('timerStart', appSettingsRef.current.soundEnabled);
      })
      .catch((error) => console.error('Failed to start short break:', error));
  }, []);

  const startLongBreak = useCallback(() => {
    if (statusRef.current !== 'idle') return;
    const seconds = settingsRef.current.longBreakMinutes * 60;
    const now = Date.now();

    invoke('timer_start', {
      id: POMODORO_ID,
      kind: { type: 'pomodoro', settings: settingsRef.current, phase: 'longBreak' },
    })
      .then(() => {
        dispatch({ type: 'START', payload: { status: 'longBreak', seconds, startedAt: now } });
        statusRef.current = 'longBreak';
        lastPhaseRef.current = 'longBreak';
        void playAlertSound('timerStart', appSettingsRef.current.soundEnabled);
      })
      .catch((error) => console.error('Failed to start long break:', error));
  }, []);

  const skip = useCallback(() => {
    if (statusRef.current === 'idle') return;
    invoke('timer_skip', { id: POMODORO_ID }).catch((error) => console.error('Failed to skip phase:', error));
  }, []);

  const reset = useCallback(() => {
    invoke('timer_reset', { id: POMODORO_ID })
      .then(() => {
        dispatch({ type: 'RESET' });
        statusRef.current = 'idle';
        lastPhaseRef.current = 'idle';
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
