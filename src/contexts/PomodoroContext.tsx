import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { useTranslation } from 'react-i18next';
import type { PomodoroSettings, PomodoroState } from '../types';
import { useTimerContext } from './TimerContext';
import { playSound } from '../utils/sound';
import { loadPomodoroSettings, savePomodoroSettings } from '../utils/storage';

type PomodoroStatus = 'idle' | 'working' | 'shortBreak' | 'longBreak';

type PomodoroAction =
  | { type: 'START'; payload: { status: PomodoroStatus; seconds: number } }
  | { type: 'TICK' }
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

const initialState: PomodoroState = {
  status: 'idle',
  completedPomodoros: 0,
  remainingSeconds: 0,
  totalElapsedSeconds: 0,
};

function pomodoroReducer(state: PomodoroState, action: PomodoroAction): PomodoroState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: action.payload.status,
        remainingSeconds: action.payload.seconds,
        totalElapsedSeconds: 0,
      };
    case 'TICK':
      if (state.remainingSeconds <= 0) {
        return state;
      }
      return {
        ...state,
        remainingSeconds: state.remainingSeconds - 1,
        totalElapsedSeconds: state.totalElapsedSeconds + 1,
      };
    case 'RESET':
      return { ...initialState };
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
  const [state, dispatch] = useReducer(pomodoroReducer, initialState);
  const intervalRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (state.status !== 'idle') {
      intervalRef.current = window.setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
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
  }, [state.status]);

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
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          permissionGranted = (await requestPermission()) === 'granted';
        }

        if (permissionGranted) {
          sendNotification({ title, body });
        }
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

    if (currentStatus === 'working') {
      const nextCompleted = currentCompleted + 1;
      dispatch({ type: 'SET_COMPLETED', payload: { count: nextCompleted } });

      if (nextCompleted % currentSettings.longBreakInterval === 0) {
        dispatch({
          type: 'START',
          payload: { status: 'longBreak', seconds: currentSettings.longBreakMinutes * 60 },
        });
        statusRef.current = 'longBreak';
        void showNotification(
          t('pomodoro.notifications.workFinishedTitle'),
          t('pomodoro.notifications.longBreakBody'),
        );
      } else {
        dispatch({
          type: 'START',
          payload: { status: 'shortBreak', seconds: currentSettings.shortBreakMinutes * 60 },
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
      dispatch({
        type: 'START',
        payload: { status: 'working', seconds: currentSettings.workMinutes * 60 },
      });
      statusRef.current = 'working';
      void showNotification(
        t('pomodoro.notifications.breakFinishedTitle'),
        t('pomodoro.notifications.breakFinishedBody'),
      );
      return;
    }

    if (currentStatus === 'longBreak') {
      dispatch({
        type: 'START',
        payload: { status: 'working', seconds: currentSettings.workMinutes * 60 },
      });
      statusRef.current = 'working';
      void showNotification(
        t('pomodoro.notifications.longBreakFinishedTitle'),
        t('pomodoro.notifications.longBreakFinishedBody'),
      );
    }
  }, [showNotification, t]);

  useEffect(() => {
    if (state.remainingSeconds === 0 && state.status !== 'idle' && state.totalElapsedSeconds > 0) {
      playPomodoroSound('timerEnd');
      const timeoutId = window.setTimeout(() => {
        autoTransition();
      }, 100);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [autoTransition, playPomodoroSound, state.remainingSeconds, state.status, state.totalElapsedSeconds]);

  const updatePomodoroSettings = useCallback(
    async (newSettings: Partial<PomodoroSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await savePomodoroSettings(updated);
    },
    [settings],
  );

  const startWork = useCallback(() => {
    dispatch({ type: 'START', payload: { status: 'working', seconds: settings.workMinutes * 60 } });
    statusRef.current = 'working';
    playPomodoroSound('timerStart');
  }, [playPomodoroSound, settings.workMinutes]);

  const startShortBreak = useCallback(() => {
    dispatch({ type: 'START', payload: { status: 'shortBreak', seconds: settings.shortBreakMinutes * 60 } });
    statusRef.current = 'shortBreak';
    playPomodoroSound('timerStart');
  }, [playPomodoroSound, settings.shortBreakMinutes]);

  const startLongBreak = useCallback(() => {
    dispatch({ type: 'START', payload: { status: 'longBreak', seconds: settings.longBreakMinutes * 60 } });
    statusRef.current = 'longBreak';
    playPomodoroSound('timerStart');
  }, [playPomodoroSound, settings.longBreakMinutes]);

  const skip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    autoTransition();
  }, [autoTransition]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    dispatch({ type: 'RESET' });
    statusRef.current = 'idle';
  }, []);

  const isRunning = state.status !== 'idle';

  return (
    <PomodoroContext.Provider
      value={{
        settings,
        pomodoroState: state,
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
    throw new Error('usePomodoroContext must be used within a PomodoroProvider');
  }

  return context;
}
