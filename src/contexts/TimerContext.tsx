import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type { TimerConfig, TimerState, TimerSegment, Settings } from '../types';
import { loadConfigs, saveConfigs, loadSettings, saveSettings } from '../utils/storage';
import { generateId, minutesToSeconds } from '../utils/time';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

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
  | { type: 'START_TIMER'; payload: { config: TimerConfig; initialSeconds: number } }
  | { type: 'TICK' }
  | { type: 'NEXT_SEGMENT'; payload: { nextIndex: number; seconds: number } }
  | { type: 'JUMP_TO_SEGMENT'; payload: { segmentIndex: number; seconds: number } }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'TIMER_END' }
  | { type: 'SET_WARNING'; payload: boolean };

const initialState: TimerState & { configs: TimerConfig[]; settings: Settings; activeConfig: TimerConfig | null; warning: boolean } = {
  configs: [],
  settings: { notificationsEnabled: true, soundEnabled: true, theme: 'system' },
  activeConfig: null,
  status: 'idle',
  currentSegmentIndex: 0,
  remainingSeconds: 0,
  totalElapsedSeconds: 0,
  warning: false,
};

function timerReducer(state: typeof initialState, action: TimerAction): typeof initialState {
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
      };
    case 'TICK':
      if (state.remainingSeconds <= 0) return state;
      const newRemaining = state.remainingSeconds - 1;
      return {
        ...state,
        remainingSeconds: newRemaining,
        totalElapsedSeconds: state.totalElapsedSeconds + 1,
        warning: newRemaining <= 30 && newRemaining > 0,
      };
    case 'NEXT_SEGMENT':
      return {
        ...state,
        currentSegmentIndex: action.payload.nextIndex,
        remainingSeconds: action.payload.seconds,
        warning: false,
      };
    case 'JUMP_TO_SEGMENT':
      return {
        ...state,
        currentSegmentIndex: action.payload.segmentIndex,
        remainingSeconds: action.payload.seconds,
        warning: false,
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
      };
    case 'SET_WARNING':
      return { ...state, warning: action.payload };
    default:
      return state;
  }
}

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(timerReducer, initialState);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    loadConfigs().then((configs) => dispatch({ type: 'SET_CONFIGS', payload: configs }));
    loadSettings().then((settings) => dispatch({ type: 'SET_SETTINGS', payload: settings }));
  }, []);

  useEffect(() => {
    if (state.status === 'running' && state.activeConfig) {
      intervalRef.current = window.setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.status, state.activeConfig]);

  useEffect(() => {
    if (state.status === 'running' && state.remainingSeconds === 0 && state.activeConfig) {
      const nextIndex = state.currentSegmentIndex + 1;
      if (nextIndex < state.activeConfig.segments.length) {
        const nextSegment = state.activeConfig.segments[nextIndex];
        handleSegmentEnd(state.activeConfig, state.currentSegmentIndex, nextSegment, nextIndex);
        dispatch({
          type: 'NEXT_SEGMENT',
          payload: { nextIndex, seconds: minutesToSeconds(nextSegment.minutes) },
        });
      } else {
        handleTimerEnd();
        dispatch({ type: 'TIMER_END' });
      }
    }
  }, [state.remainingSeconds, state.status, state.currentSegmentIndex, state.activeConfig]);

  const playSound = useCallback(async () => {
    if (!state.settings.soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Failed to play sound:', e);
    }
  }, [state.settings.soundEnabled]);

  const showNotification = useCallback(async (title: string, body: string) => {
    if (!state.settings.notificationsEnabled) return;
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        sendNotification({ title, body });
      }
    } catch (e) {
      console.error('Failed to show notification:', e);
    }
  }, [state.settings.notificationsEnabled]);

  const handleSegmentEnd = useCallback((config: TimerConfig, segmentIndex: number, nextSegment: TimerSegment, _nextIndex: number) => {
    playSound();
    showNotification(
      `「${config.segments[segmentIndex].name}」时间到！`,
      `下一个题型：「${nextSegment.name}」`
    );
  }, [playSound, showNotification]);

  const handleTimerEnd = useCallback(() => {
    playSound();
    showNotification('计时结束！', '所有题型时间已用完');
  }, [playSound, showNotification]);

  const addConfig = useCallback(async (config: Omit<TimerConfig, 'id' | 'createdAt'>) => {
    const newConfig: TimerConfig = {
      ...config,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const newConfigs = [...state.configs, newConfig];
    await saveConfigs(newConfigs);
    dispatch({ type: 'SET_CONFIGS', payload: newConfigs });
  }, [state.configs]);

  const updateConfig = useCallback(async (id: string, config: Partial<TimerConfig>) => {
    const newConfigs = state.configs.map((c) => (c.id === id ? { ...c, ...config } : c));
    await saveConfigs(newConfigs);
    dispatch({ type: 'SET_CONFIGS', payload: newConfigs });
  }, [state.configs]);

  const deleteConfig = useCallback(async (id: string) => {
    const newConfigs = state.configs.filter((c) => c.id !== id);
    await saveConfigs(newConfigs);
    dispatch({ type: 'SET_CONFIGS', payload: newConfigs });
  }, [state.configs]);

  const startTimer = useCallback((configId: string) => {
    const config = state.configs.find((c) => c.id === configId);
    if (!config || config.segments.length === 0) return;
    const initialSeconds = minutesToSeconds(config.segments[0].minutes);
    dispatch({ type: 'START_TIMER', payload: { config, initialSeconds } });
  }, [state.configs]);

  const pauseTimer = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);

  const resumeTimer = useCallback(() => {
    dispatch({ type: 'RESUME' });
  }, []);

  const resetTimer = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const jumpToSegment = useCallback((segmentIndex: number) => {
    if (!state.activeConfig) return;
    const segment = state.activeConfig.segments[segmentIndex];
    if (!segment) return;
    dispatch({
      type: 'JUMP_TO_SEGMENT',
      payload: { segmentIndex, seconds: minutesToSeconds(segment.minutes) },
    });
  }, [state.activeConfig]);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const updated = { ...state.settings, ...newSettings };
    await saveSettings(updated);
    dispatch({ type: 'SET_SETTINGS', payload: updated });
  }, [state.settings]);

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
