import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
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
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'SET_EDITING'; payload: boolean };

const initialState: CountdownState = {
  totalSeconds: 300,
  timeLeft: 300,
  isRunning: false,
  isEditing: true,
};

function countdownReducer(state: CountdownState, action: CountdownAction): CountdownState {
  switch (action.type) {
    case 'SET_TOTAL_SECONDS':
      return { ...state, totalSeconds: action.payload };
    case 'SET_TIME_LEFT':
      return { ...state, timeLeft: action.payload };
    case 'START':
      return { ...state, isRunning: true, isEditing: false };
    case 'PAUSE':
      return { ...state, isRunning: false };
    case 'RESET':
      return { ...state, isRunning: false, timeLeft: state.totalSeconds, isEditing: true };
    case 'TICK':
      if (state.timeLeft <= 0) return { ...state, isRunning: false };
      return { ...state, timeLeft: state.timeLeft - 1 };
    case 'SET_EDITING':
      return { ...state, isEditing: action.payload };
    default:
      return state;
  }
}

const CountdownContext = createContext<CountdownContextType | null>(null);

export function CountdownProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(countdownReducer, initialState);

  useEffect(() => {
    let interval: number | null = null;
    if (state.isRunning && state.timeLeft > 0) {
      interval = window.setInterval(() => {
        dispatch({ type: 'TICK' });
      }, 1000);
    } else if (state.timeLeft === 0 && state.isRunning) {
      dispatch({ type: 'PAUSE' });
      playSound('timerEnd');
    }
    return () => { if (interval) clearInterval(interval); };
  }, [state.isRunning, state.timeLeft]);

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
    dispatch({ type: 'START' });
    playSound('timerStart');
  }, [state.isEditing, state.timeLeft]);

  const pause = useCallback(() => {
    if (!state.isRunning) return;
    dispatch({ type: 'PAUSE' });
    playSound('hover');
  }, [state.isRunning]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
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