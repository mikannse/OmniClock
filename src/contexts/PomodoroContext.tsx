import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import type { PomodoroSettings, PomodoroState } from '../types';
import { useTimerContext } from './TimerContext';
import { playSound } from '../utils/sound';
import { loadPomodoroSettings, savePomodoroSettings } from '../utils/storage';

type PomodoroStatus = 'idle' | 'working' | 'shortBreak' | 'longBreak';

type PomodoroAction =
  | { type: 'START'; payload: { status: PomodoroStatus; seconds: number; startedAt: number } }
  | { type: 'TICK'; payload: { remainingSeconds: number; totalElapsedSeconds: number } }
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
      };
    case 'RESET':
      return { ...initialStateExtended };
    case 'SET_COMPLETED':
      return { ...state, completedPomodoros: action.payload.count };
    default:
      return state;
  }
}

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { settings: appSettings } = useTimerContext();
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings);
  const [state, dispatch] = useReducer(pomodoroReducer, initialStateExtended);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const statusRef = useRef<PomodoroStatus>('idle');
  const completedRef = useRef(0);
  const settingsRef = useRef(settings);
  const startedAtRef = useRef<number>(0);
  const initialSecondsRef = useRef<number>(0);

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

  const autoTransition = useCallback(() => {
    const currentSettings = settingsRef.current;
    const currentStatus = statusRef.current;
    const currentCompleted = completedRef.current;
    const now = Date.now();

    if (currentStatus === 'working') {
      const nextCompleted = currentCompleted + 1;
      dispatch({ type: 'SET_COMPLETED', payload: { count: nextCompleted } });

      if (nextCompleted % currentSettings.longBreakInterval === 0) {
        const seconds = currentSettings.longBreakMinutes * 60;
        initialSecondsRef.current = seconds;
        startedAtRef.current = now;
        dispatch({
          type: 'START',
          payload: { status: 'longBreak', seconds, startedAt: now },
        });
        statusRef.current = 'longBreak';
        void showNotification(
          t('pomodoro.notifications.workFinishedTitle'),
          t('pomodoro.notifications.longBreakBody'),
        );
      } else {
        const seconds = currentSettings.shortBreakMinutes * 60;
        initialSecondsRef.current = seconds;
        startedAtRef.current = now;
        dispatch({
          type: 'START',
          payload: { status: 'shortBreak', seconds, startedAt: now },
        });
        statusRef.current = 'shortBreak';
        void showNotification(
          t('pomodoro.notifications.workFinishedTitle'),
          t('pomodoro.notifications.shortBreakBody'),
        );
      }
      return;
    }

    if (currentStatus === 'shortBreak') {
      const seconds = currentSettings.workMinutes * 60;
      initialSecondsRef.current = seconds;
      startedAtRef.current = now;
      dispatch({
        type: 'START',
        payload: { status: 'working', seconds, startedAt: now },
      });
      statusRef.current = 'working';
      void showNotification(
        t('pomodoro.notifications.breakFinishedTitle'),
        t('pomodoro.notifications.breakFinishedBody'),
      );
      return;
    }

    if (currentStatus === 'longBreak') {
      const seconds = currentSettings.workMinutes * 60;
      initialSecondsRef.current = seconds;
      startedAtRef.current = now;
      dispatch({
        type: 'START',
        payload: { status: 'working', seconds, startedAt: now },
      });
      statusRef.current = 'working';
      void showNotification(
        t('pomodoro.notifications.longBreakFinishedTitle'),
        t('pomodoro.notifications.longBreakFinishedBody'),
      );
    }
  }, [showNotification, t]);

  const scheduleEndTimeout = useCallback((startedAt: number, durationSeconds: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const endTime = startedAt + (durationSeconds * 1000);
    const delay = endTime - Date.now();

    if (delay <= 0) {
      autoTransition();
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      playPomodoroSound('timerEnd');
      autoTransition();
    }, delay);
  }, [autoTransition, playPomodoroSound]);

  useEffect(() => {
    if (state.status !== 'idle' && state.startedAt !== null) {
      const updateDisplay = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startedAtRef.current) / 1000);
        const remaining = Math.max(0, initialSecondsRef.current - elapsed);
        const total = elapsed;

        dispatch({
          type: 'TICK',
          payload: { remainingSeconds: remaining, totalElapsedSeconds: total },
        });
      };

      updateDisplay();
      intervalRef.current = window.setInterval(updateDisplay, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.status, state.startedAt]);

  useEffect(() => {
    if (state.status !== 'idle' && state.startedAt !== null && initialSecondsRef.current > 0) {
      scheduleEndTimeout(state.startedAt, initialSecondsRef.current);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [state.status, state.startedAt, scheduleEndTimeout]);

  const updatePomodoroSettings = useCallback(
    async (newSettings: Partial<PomodoroSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await savePomodoroSettings(updated);
    },
    [settings],
  );

  const startWork = useCallback(() => {
    const seconds = settingsRef.current.workMinutes * 60;
    const now = Date.now();
    initialSecondsRef.current = seconds;
    startedAtRef.current = now;
    dispatch({ type: 'START', payload: { status: 'working', seconds, startedAt: now } });
    statusRef.current = 'working';
    playPomodoroSound('timerStart');
  }, [playPomodoroSound]);

  const startShortBreak = useCallback(() => {
    const seconds = settingsRef.current.shortBreakMinutes * 60;
    const now = Date.now();
    initialSecondsRef.current = seconds;
    startedAtRef.current = now;
    dispatch({ type: 'START', payload: { status: 'shortBreak', seconds, startedAt: now } });
    statusRef.current = 'shortBreak';
    playPomodoroSound('timerStart');
  }, [playPomodoroSound]);

  const startLongBreak = useCallback(() => {
    const seconds = settingsRef.current.longBreakMinutes * 60;
    const now = Date.now();
    initialSecondsRef.current = seconds;
    startedAtRef.current = now;
    dispatch({ type: 'START', payload: { status: 'longBreak', seconds, startedAt: now } });
    statusRef.current = 'longBreak';
    playPomodoroSound('timerStart');
  }, [playPomodoroSound]);

  const skip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    autoTransition();
  }, [autoTransition]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    dispatch({ type: 'RESET' });
    statusRef.current = 'idle';
    startedAtRef.current = 0;
    initialSecondsRef.current = 0;
  }, []);

  const isRunning = state.status !== 'idle';

  const exportedState: PomodoroState = {
    status: state.status,
    completedPomodoros: state.completedPomodoros,
    remainingSeconds: state.remainingSeconds,
    totalElapsedSeconds: state.totalElapsedSeconds,
  };

  return (
    <PomodoroContext.Provider
      value={{
        settings,
        pomodoroState: exportedState,
        isRunning,
        updatePomodoroSettings,
        startWork,
        startShortBreak,
        startLongBreak,
        skip,
        reset,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoroContext() {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error('usePomodoroContext must be used within PomodoroProvider');
  }

  return context;
}
