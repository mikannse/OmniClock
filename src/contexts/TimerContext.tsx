import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { message } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import type { Settings, TimerConfig, TimerSegment, TimerState } from '../types';
import { setAutostart } from '../utils/autostart';
import { playSound } from '../utils/sound';
import { loadConfigs, loadSettings, saveConfigs, saveSettings } from '../utils/storage';
import { generateId, minutesToSeconds } from '../utils/time';

interface TimerContextType {
  configs: TimerConfig[];
  settings: Settings;
  timerState: TimerState;
  activeConfig: TimerConfig | null;
  warning: boolean;
  addConfig: (config: Omit<TimerConfig, 'id' | 'createdAt'>) => Promise<void>;
  updateConfig: (id: string, config: Partial<TimerConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  startTimer: (configId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  jumpToSegment: (segmentIndex: number) => void;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
}

type TimerAction =
  | { type: 'SET_CONFIGS'; payload: TimerConfig[] }
  | { type: 'SET_SETTINGS'; payload: Settings }
  | { type: 'START_TIMER'; payload: { config: TimerConfig; initialSeconds: number; startedAt: number } }
  | { type: 'TICK'; payload: { remainingSeconds: number; totalElapsedSeconds: number; warning: boolean } }
  | { type: 'NEXT_SEGMENT'; payload: { nextIndex: number; seconds: number; startedAt: number } }
  | { type: 'JUMP_TO_SEGMENT'; payload: { segmentIndex: number; seconds: number; startedAt: number } }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'TIMER_END' };

type TimerContextState = TimerState & {
  configs: TimerConfig[];
  settings: Settings;
  activeConfig: TimerConfig | null;
  warning: boolean;
  startedAt: number | null;
};

const initialSettings: Settings = {
  notificationsEnabled: true,
  soundEnabled: true,
  theme: 'system',
  autostartEnabled: false,
  closeToTray: false,
};

const initialState: TimerContextState = {
  configs: [],
  settings: initialSettings,
  activeConfig: null,
  status: 'idle',
  currentSegmentIndex: 0,
  remainingSeconds: 0,
  totalElapsedSeconds: 0,
  warning: false,
  startedAt: null,
};

const CLOSE_TO_TRAY_HINT_KEY = 'close_to_tray_hint_shown';

function calculateTotalMinutes(segments: TimerSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.minutes, 0);
}

function timerReducer(state: TimerContextState, action: TimerAction): TimerContextState {
  switch (action.type) {
    case 'SET_CONFIGS':
      return { ...state, configs: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'START_TIMER':
      return {
        ...state,
        status: 'running',
        activeConfig: action.payload.config,
        currentSegmentIndex: 0,
        remainingSeconds: action.payload.initialSeconds,
        totalElapsedSeconds: 0,
        warning: false,
        startedAt: action.payload.startedAt,
      };
    case 'TICK':
      return {
        ...state,
        remainingSeconds: action.payload.remainingSeconds,
        totalElapsedSeconds: action.payload.totalElapsedSeconds,
        warning: action.payload.warning,
      };
    case 'NEXT_SEGMENT':
      return {
        ...state,
        currentSegmentIndex: action.payload.nextIndex,
        remainingSeconds: action.payload.seconds,
        warning: false,
        startedAt: action.payload.startedAt,
      };
    case 'JUMP_TO_SEGMENT':
      return {
        ...state,
        currentSegmentIndex: action.payload.segmentIndex,
        remainingSeconds: action.payload.seconds,
        warning: false,
        startedAt: action.payload.startedAt,
      };
    case 'PAUSE':
      return { ...state, status: 'paused' };
    case 'RESUME':
      return { ...state, status: 'running' };
    case 'RESET':
    case 'TIMER_END':
      return {
        ...state,
        status: 'idle',
        activeConfig: null,
        currentSegmentIndex: 0,
        remainingSeconds: 0,
        totalElapsedSeconds: 0,
        warning: false,
        startedAt: null,
      };
    default:
      return state;
  }
}

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(timerReducer, initialState);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const initialSecondsRef = useRef<number>(0);
  const currentSegmentIndexRef = useRef<number>(0);
  const activeConfigRef = useRef<TimerConfig | null>(null);
  const segmentsLengthRef = useRef<number>(0);

  useEffect(() => {
    void loadConfigs().then((configs) => dispatch({ type: 'SET_CONFIGS', payload: configs }));
    void loadSettings().then((settings) => {
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      void setAutostart(settings.autostartEnabled).catch(console.error);
    });
  }, []);

  const playTimerSound = useCallback(
    (type: 'segmentEnd' | 'timerEnd' | 'timerStart') => {
      void playSound(type, state.settings.soundEnabled);
    },
    [state.settings.soundEnabled],
  );

  const showNotification = useCallback(
    async (title: string, body: string) => {
      if (!state.settings.notificationsEnabled) {
        return;
      }

      try {
        await invoke('send_notification', { title, body });
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
    },
    [state.settings.notificationsEnabled],
  );

  const handleSegmentEnd = useCallback(
    (config: TimerConfig, segmentIndex: number, nextSegment: TimerSegment) => {
      playTimerSound('segmentEnd');
      void showNotification(
        t('timer.notifications.segmentCompleteTitle', {
          segment: config.segments[segmentIndex]?.name ?? nextSegment.name,
        }),
        t('timer.notifications.segmentCompleteBody', { segment: nextSegment.name }),
      );
    },
    [playTimerSound, showNotification, t],
  );

  const handleTimerEnd = useCallback(() => {
    playTimerSound('timerEnd');
    void showNotification(
      t('timer.notifications.completeTitle'),
      t('timer.notifications.completeBody'),
    );
  }, [playTimerSound, showNotification, t]);

  const scheduleSegmentTransition = useCallback((segmentIndex: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const config = activeConfigRef.current;
    if (!config || segmentIndex >= config.segments.length) {
      handleTimerEnd();
      dispatch({ type: 'TIMER_END' });
      return;
    }

    const segment = config.segments[segmentIndex];
    const seconds = minutesToSeconds(segment.minutes);
    const endTime = startedAtRef.current + (seconds * 1000);
    const delay = endTime - Date.now();

    if (delay <= 0) {
      if (segmentIndex + 1 < config.segments.length) {
        const nextSegment = config.segments[segmentIndex + 1];
        handleSegmentEnd(config, segmentIndex, nextSegment);
        const nextSeconds = minutesToSeconds(nextSegment.minutes);
        const now = Date.now();
        initialSecondsRef.current = nextSeconds;
        startedAtRef.current = now;
        currentSegmentIndexRef.current = segmentIndex + 1;
        dispatch({
          type: 'NEXT_SEGMENT',
          payload: { nextIndex: segmentIndex + 1, seconds: nextSeconds, startedAt: now },
        });
        scheduleSegmentTransition(segmentIndex + 1);
      } else {
        handleTimerEnd();
        dispatch({ type: 'TIMER_END' });
      }
      return;
    }

    timeoutRef.current = window.setTimeout(() => {
      if (segmentIndex + 1 < config.segments.length) {
        const nextSegment = config.segments[segmentIndex + 1];
        handleSegmentEnd(config, segmentIndex, nextSegment);
        const nextSeconds = minutesToSeconds(nextSegment.minutes);
        const now = Date.now();
        initialSecondsRef.current = nextSeconds;
        startedAtRef.current = now;
        currentSegmentIndexRef.current = segmentIndex + 1;
        dispatch({
          type: 'NEXT_SEGMENT',
          payload: { nextIndex: segmentIndex + 1, seconds: nextSeconds, startedAt: now },
        });
        scheduleSegmentTransition(segmentIndex + 1);
      } else {
        handleTimerEnd();
        dispatch({ type: 'TIMER_END' });
      }
    }, delay);
  }, [handleSegmentEnd, handleTimerEnd]);

  useEffect(() => {
    if (state.status === 'running' && state.startedAt !== null) {
      const updateDisplay = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startedAtRef.current) / 1000);
        const remaining = Math.max(0, initialSecondsRef.current - elapsed);
        const total = elapsed;

        dispatch({
          type: 'TICK',
          payload: {
            remainingSeconds: remaining,
            totalElapsedSeconds: total,
            warning: remaining <= 30 && remaining > 0,
          },
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
    if (state.status === 'running' && state.startedAt !== null && state.activeConfig) {
      activeConfigRef.current = state.activeConfig;
      segmentsLengthRef.current = state.activeConfig.segments.length;
      scheduleSegmentTransition(state.currentSegmentIndex);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [state.status, state.startedAt, state.currentSegmentIndex, state.activeConfig, scheduleSegmentTransition]);

  const addConfig = useCallback(
    async (config: Omit<TimerConfig, 'id' | 'createdAt'>) => {
      const newConfig: TimerConfig = {
        ...config,
        totalMinutes: calculateTotalMinutes(config.segments),
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const newConfigs = [...state.configs, newConfig];
      await saveConfigs(newConfigs);
      dispatch({ type: 'SET_CONFIGS', payload: newConfigs });
    },
    [state.configs],
  );

  const updateConfig = useCallback(
    async (id: string, config: Partial<TimerConfig>) => {
      const newConfigs = state.configs.map((currentConfig) => {
        if (currentConfig.id !== id) {
          return currentConfig;
        }

        const segments = config.segments ?? currentConfig.segments;
        return {
          ...currentConfig,
          ...config,
          segments,
          totalMinutes: calculateTotalMinutes(segments),
        };
      });

      await saveConfigs(newConfigs);
      dispatch({ type: 'SET_CONFIGS', payload: newConfigs });
    },
    [state.configs],
  );

  const deleteConfig = useCallback(
    async (id: string) => {
      const newConfigs = state.configs.filter((config) => config.id !== id);
      await saveConfigs(newConfigs);
      dispatch({ type: 'SET_CONFIGS', payload: newConfigs });
    },
    [state.configs],
  );

  const startTimer = useCallback(
    (configId: string) => {
      const config = state.configs.find((item) => item.id === configId);
      if (!config || config.segments.length === 0) {
        return;
      }

      const seconds = minutesToSeconds(config.segments[0].minutes);
      const now = Date.now();
      initialSecondsRef.current = seconds;
      startedAtRef.current = now;
      currentSegmentIndexRef.current = 0;
      activeConfigRef.current = config;
      segmentsLengthRef.current = config.segments.length;
      dispatch({
        type: 'START_TIMER',
        payload: { config, initialSeconds: seconds, startedAt: now },
      });
      playTimerSound('timerStart');
    },
    [playTimerSound, state.configs],
  );

  const pauseTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    dispatch({ type: 'PAUSE' });
  }, []);

  const resumeTimer = useCallback(() => {
    dispatch({ type: 'RESUME' });
  }, []);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    dispatch({ type: 'RESET' });
    startedAtRef.current = 0;
    initialSecondsRef.current = 0;
    currentSegmentIndexRef.current = 0;
    activeConfigRef.current = null;
    segmentsLengthRef.current = 0;
  }, []);

  const jumpToSegment = useCallback(
    (segmentIndex: number) => {
      if (!state.activeConfig) {
        return;
      }

      const segment = state.activeConfig.segments[segmentIndex];
      if (!segment) {
        return;
      }

      const seconds = minutesToSeconds(segment.minutes);
      const now = Date.now();
      initialSecondsRef.current = seconds;
      startedAtRef.current = now;
      currentSegmentIndexRef.current = segmentIndex;
      dispatch({
        type: 'JUMP_TO_SEGMENT',
        payload: { segmentIndex, seconds, startedAt: now },
      });
    },
    [state.activeConfig],
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<Settings>) => {
      const updatedSettings = { ...state.settings, ...newSettings };
      await saveSettings(updatedSettings);

      if (newSettings.autostartEnabled !== undefined) {
        await setAutostart(newSettings.autostartEnabled);
      }

      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });

      if (
        newSettings.closeToTray === true
        && !state.settings.closeToTray
        && localStorage.getItem(CLOSE_TO_TRAY_HINT_KEY) !== 'true'
      ) {
        localStorage.setItem(CLOSE_TO_TRAY_HINT_KEY, 'true');
        await message(t('settings.closeToTrayHintBody'), {
          title: t('settings.closeToTrayHintTitle'),
          kind: 'info',
        });
      }
    },
    [state.settings, t],
  );

  return (
    <TimerContext.Provider
      value={{
        configs: state.configs,
        settings: state.settings,
        timerState: {
          status: state.status,
          currentSegmentIndex: state.currentSegmentIndex,
          remainingSeconds: state.remainingSeconds,
          totalElapsedSeconds: state.totalElapsedSeconds,
        },
        activeConfig: state.activeConfig,
        warning: state.warning,
        addConfig,
        updateConfig,
        deleteConfig,
        startTimer,
        pauseTimer,
        resumeTimer,
        resetTimer,
        jumpToSegment,
        updateSettings,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimerContext() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }

  return context;
}
