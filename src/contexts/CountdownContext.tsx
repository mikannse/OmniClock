import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { playSound } from '../utils/sound';

interface CountdownState {
  totalSeconds: number;
  timeLeft: number;
  isRunning: boolean;
  isEditing: boolean;
}

interface CountdownContextType {
  state: CountdownState;
  setTotalSeconds: (seconds: number) => void;
  setTimeLeft: (seconds: number) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  adjustTime: (amount: number, unit: 'hours' | 'minutes' | 'seconds') => void;
}

type CountdownAction =
  | { type: 'SET_TOTAL_SECONDS'; payload: number }
  | { type: 'SET_TIME_LEFT'; payload: number }
  | { type: 'START'; payload: { startedAt: number } }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'TICK'; payload: { timeLeft: number } }
  | { type: 'SET_EDITING'; payload: boolean };

const initialState: CountdownState = {
  totalSeconds: 300,
  timeLeft: 300,
  isRunning: false,
  isEditing: true,
};

interface CountdownStateExtended extends CountdownState {
  startedAt: number | null;
}

const initialStateExtended: CountdownStateExtended = {
  ...initialState,
  startedAt: null,
};

function countdownReducer(state: CountdownStateExtended, action: CountdownAction): CountdownStateExtended {
  switch (action.type) {
    case 'SET_TOTAL_SECONDS':
      return { ...state, totalSeconds: action.payload };
    case 'SET_TIME_LEFT':
      return { ...state, timeLeft: action.payload };
    case 'START':
      return { ...state, isRunning: true, isEditing: false, startedAt: action.payload.startedAt };
    case 'PAUSE':
      return { ...state, isRunning: false };
    case 'RESET':
      return { ...state, isRunning: false, timeLeft: state.totalSeconds, isEditing: true, startedAt: null };
    case 'TICK':
      return { ...state, timeLeft: action.payload.timeLeft };
    case 'SET_EDITING':
      return { ...state, isEditing: action.payload };
    default:
      return state;
  }
}

const CountdownContext = createContext<CountdownContextType | null>(null);

export function CountdownProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(countdownReducer, initialStateExtended);
  const isRunningRef = useRef<boolean>(false);
  const isEditingRef = useRef<boolean>(false);
  const timeLeftRef = useRef<number>(300);

  useEffect(() => {
    isRunningRef.current = state.isRunning;
  }, [state.isRunning]);

  useEffect(() => {
    isEditingRef.current = state.isEditing;
  }, [state.isEditing]);

  useEffect(() => {
    timeLeftRef.current = state.timeLeft;
  }, [state.timeLeft]);

  useEffect(() => {
    let unlistenTick: (() => void) | undefined;
    let unlistenTransition: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenTick = await listen('countdown:tick', (event) => {
        const payload = event.payload as Record<string, unknown>;
        if (typeof payload.timeLeft !== 'number') {
          console.error('Invalid countdown:tick payload', payload);
          return;
        }
        timeLeftRef.current = payload.timeLeft;
        dispatch({ type: 'TICK', payload: { timeLeft: payload.timeLeft } });
      });

      unlistenTransition = await listen('timer:transition', (event) => {
        const payload = event.payload as Record<string, unknown>;
        if (payload.type === 'countdown_end') {
          dispatch({ type: 'PAUSE' });
          playSound('timerEnd');
        }
      });
    };

    void setupListeners();

    return () => {
      if (unlistenTick) unlistenTick();
      if (unlistenTransition) unlistenTransition();
    };
  }, []);

  const setTotalSeconds = useCallback((seconds: number) => {
    dispatch({ type: 'SET_TOTAL_SECONDS', payload: seconds });
  }, []);

  const setTimeLeft = useCallback((seconds: number) => {
    dispatch({ type: 'SET_TIME_LEFT', payload: seconds });
  }, []);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    if (isEditingRef.current && timeLeftRef.current > 0) {
      dispatch({ type: 'SET_EDITING', payload: false });
    }
    const seconds = timeLeftRef.current;
    const now = Date.now();
    invoke('timer_start', { kind: { type: 'countdown', totalSeconds: seconds } })
      .then(() => {
        dispatch({ type: 'START', payload: { startedAt: now } });
        playSound('timerStart');
      })
      .catch((error) => console.error('Failed to start countdown:', error));
  }, []);

  const pause = useCallback(() => {
    if (!isRunningRef.current) return;
    invoke('timer_pause')
      .then(() => {
        dispatch({ type: 'PAUSE' });
        playSound('hover');
      })
      .catch((error) => console.error('Failed to pause countdown:', error));
  }, []);

  const reset = useCallback(() => {
    invoke('timer_reset')
      .then(() => {
        dispatch({ type: 'RESET' });
      })
      .catch((error) => console.error('Failed to reset countdown:', error));
  }, []);

  const adjustTime = useCallback((amount: number, unit: 'hours' | 'minutes' | 'seconds') => {
    if (!isEditingRef.current) return;
    let seconds = 0;
    if (unit === 'hours') seconds = amount * 3600;
    else if (unit === 'minutes') seconds = amount * 60;
    else seconds = amount;
    const newTime = Math.max(0, Math.min(86399, timeLeftRef.current + seconds));
    dispatch({ type: 'SET_TIME_LEFT', payload: newTime });
    dispatch({ type: 'SET_TOTAL_SECONDS', payload: newTime });
  }, []);

  const value = React.useMemo(
    () => ({
      state,
      setTotalSeconds,
      setTimeLeft,
      start,
      pause,
      reset,
      adjustTime,
    }),
    [state, setTotalSeconds, setTimeLeft, start, pause, reset, adjustTime],
  );

  return (
    <CountdownContext.Provider value={value}>
      {children}
    </CountdownContext.Provider>
  );
}

export function useCountdownContext() {
  const context = useContext(CountdownContext);
  if (!context) {
    throw new Error('useCountdownContext must be used within a CountdownProvider');
  }
  return context;
}
