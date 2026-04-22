import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
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
  const intervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const initialSecondsRef = useRef<number>(0);

  useEffect(() => {
    if (state.isRunning && state.startedAt !== null) {
      intervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startedAtRef.current) / 1000);
        const remaining = Math.max(0, initialSecondsRef.current - elapsed);

        if (remaining === 0) {
          dispatch({ type: 'PAUSE' });
          playSound('timerEnd');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else {
          dispatch({ type: 'TICK', payload: { timeLeft: remaining } });
        }
      }, 100);
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
  }, [state.isRunning, state.startedAt]);

  const setTotalSeconds = useCallback((seconds: number) => {
    dispatch({ type: 'SET_TOTAL_SECONDS', payload: seconds });
  }, []);

  const setTimeLeft = useCallback((seconds: number) => {
    dispatch({ type: 'SET_TIME_LEFT', payload: seconds });
  }, []);

  const start = useCallback(() => {
    if (state.isEditing && state.timeLeft > 0) {
      dispatch({ type: 'SET_EDITING', payload: false });
    }
    const now = Date.now();
    initialSecondsRef.current = state.timeLeft;
    startedAtRef.current = now;
    dispatch({ type: 'START', payload: { startedAt: now } });
    playSound('timerStart');
  }, [state.isEditing, state.timeLeft]);

  const pause = useCallback(() => {
    if (!state.isRunning) return;
    dispatch({ type: 'PAUSE' });
    playSound('hover');
  }, [state.isRunning]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    dispatch({ type: 'RESET' });
    startedAtRef.current = 0;
    initialSecondsRef.current = 0;
  }, []);

  const adjustTime = useCallback((amount: number, unit: 'hours' | 'minutes' | 'seconds') => {
    if (!state.isEditing) return;
    let seconds = 0;
    if (unit === 'hours') seconds = amount * 3600;
    else if (unit === 'minutes') seconds = amount * 60;
    else seconds = amount;
    const newTime = Math.max(0, Math.min(86399, state.timeLeft + seconds));
    dispatch({ type: 'SET_TIME_LEFT', payload: newTime });
    dispatch({ type: 'SET_TOTAL_SECONDS', payload: newTime });
  }, [state.isEditing, state.timeLeft]);

  return (
    <CountdownContext.Provider value={{ state, setTotalSeconds, setTimeLeft, start, pause, reset, adjustTime }}>
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
