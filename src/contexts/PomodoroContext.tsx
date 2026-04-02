import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import type { PomodoroSettings, PomodoroState } from '../types';
import { loadPomodoroSettings, savePomodoroSettings } from '../utils/storage';
import { invoke } from '@tauri-apps/api/core';

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
      if (state.remainingSeconds <= 0) return state;
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
  const [settings, setSettings] = useState<PomodoroSettings>(defaultSettings);
  const [state, dispatch] = useReducer(pomodoroReducer, initialState);
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const statusRef = useRef<PomodoroStatus>('idle');
  const completedRef = useRef(0);
  const settingsRef = useRef(settings);
  const showNotificationRef = useRef<(title: string, body: string) => void>(() => {});

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
    loadPomodoroSettings().then(setSettings);
  }, []);

  useEffect(() => {
    const isActive = statusRef.current !== 'idle';
    if (isActive) {
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
        intervalRef.current = null;
      }
    };
  }, [state.status, settings]);

  const playSound = useCallback(async (soundType: 'timerStart' | 'timerEnd' = 'timerEnd') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (soundType === 'timerStart') {
        // Short ascending chirp (400Hz → 600Hz)
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
      } else {
        // Original timer end sound (800Hz)
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.error('Failed to play sound:', e);
    }
  }, []);

  const showNotification = useCallback(async (title: string, body: string) => {
    // Try browser notification first (works in dev mode)
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
        return;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
          return;
        }
      }
    }

    // Fallback to Tauri native notification (better for background)
    try {
      await invoke('show_native_notification', {
        title,
        body,
      });
    } catch (e) {
      console.error('Failed to show notification:', e);
    }
  }, []);

  // Keep ref updated with latest showNotification
  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  const autoTransitionRef = useRef<() => void>(() => {
    const currentSettings = settingsRef.current;
    const currentStatus = statusRef.current;
    const currentCompleted = completedRef.current;

    if (currentStatus === 'working') {
      const newCompleted = currentCompleted + 1;
      dispatch({ type: 'SET_COMPLETED', payload: { count: newCompleted } });

      if (newCompleted % currentSettings.longBreakInterval === 0) {
        dispatch({ type: 'START', payload: { status: 'longBreak', seconds: currentSettings.longBreakMinutes * 60 } });
        statusRef.current = 'longBreak';
        showNotificationRef.current('番茄钟完成！', '开始长休息吧！');
      } else {
        dispatch({ type: 'START', payload: { status: 'shortBreak', seconds: currentSettings.shortBreakMinutes * 60 } });
        statusRef.current = 'shortBreak';
        showNotificationRef.current('番茄钟完成！', '休息一下，准备下一个！');
      }
    } else if (currentStatus === 'shortBreak') {
      dispatch({ type: 'START', payload: { status: 'working', seconds: currentSettings.workMinutes * 60 } });
      statusRef.current = 'working';
      showNotificationRef.current('休息结束！', '开始下一个番茄钟！');
    } else if (currentStatus === 'longBreak') {
      dispatch({ type: 'START', payload: { status: 'working', seconds: currentSettings.workMinutes * 60 } });
      statusRef.current = 'working';
      showNotificationRef.current('长休息结束！', '开始新的番茄钟！');
    }
  });

  useEffect(() => {
    if (state.remainingSeconds === 0 && state.status !== 'idle' && state.totalElapsedSeconds > 0) {
      playSound();
      setTimeout(() => {
        autoTransitionRef.current();
      }, 100);
    }
  }, [state.remainingSeconds, state.status, state.totalElapsedSeconds, playSound]);

  const updatePomodoroSettings = useCallback(async (newSettings: Partial<PomodoroSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await savePomodoroSettings(updated);
  }, [settings]);

  const startWork = useCallback(() => {
    const seconds = settings.workMinutes * 60;
    dispatch({ type: 'START', payload: { status: 'working', seconds } });
    statusRef.current = 'working';
    playSound('timerStart');
  }, [settings.workMinutes]);

  const startShortBreak = useCallback(() => {
    const seconds = settings.shortBreakMinutes * 60;
    dispatch({ type: 'START', payload: { status: 'shortBreak', seconds } });
    statusRef.current = 'shortBreak';
    playSound('timerStart');
  }, [settings.shortBreakMinutes]);

  const startLongBreak = useCallback(() => {
    const seconds = settings.longBreakMinutes * 60;
    dispatch({ type: 'START', payload: { status: 'longBreak', seconds } });
    statusRef.current = 'longBreak';
    playSound('timerStart');
  }, [settings.longBreakMinutes]);

  const skip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    autoTransitionRef.current();
  }, []);

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
