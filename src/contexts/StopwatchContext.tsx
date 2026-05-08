import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import type { StopwatchLap } from '../types';
import { generateId } from '../utils/time';
import { playSound } from '../utils/sound';

interface StopwatchState {
  isRunning: boolean;
  elapsedMs: number;
  laps: StopwatchLap[];
  lastLapTime: number;
}

interface StopwatchContextType {
  state: StopwatchState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  lap: () => void;
}

type StopwatchAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'TICK'; payload: number }
  | { type: 'ADD_LAP'; payload: StopwatchLap };

const initialState: StopwatchState = {
  isRunning: false,
  elapsedMs: 0,
  laps: [],
  lastLapTime: 0,
};

function stopwatchReducer(state: StopwatchState, action: StopwatchAction): StopwatchState {
  switch (action.type) {
    case 'START':
      return { ...state, isRunning: true };
    case 'PAUSE':
      return { ...state, isRunning: false };
    case 'RESET':
      return { ...initialState };
    case 'TICK':
      return { ...state, elapsedMs: action.payload };
    case 'ADD_LAP':
      return { ...state, laps: [action.payload, ...state.laps], lastLapTime: action.payload.time };
    default:
      return state;
  }
}

const StopwatchContext = createContext<StopwatchContextType | null>(null);

export function StopwatchProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(stopwatchReducer, initialState);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const elapsedMsRef = useRef<number>(0);
  const lastLapTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  useEffect(() => {
    isRunningRef.current = state.isRunning;
  }, [state.isRunning]);

  useEffect(() => {
    if (state.isRunning) {
      startTimeRef.current = Date.now() - pausedTimeRef.current;
      intervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        elapsedMsRef.current = elapsed;
        dispatch({ type: 'TICK', payload: elapsed });
        pausedTimeRef.current = elapsed;
      }, 10);
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
  }, [state.isRunning]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;
    dispatch({ type: 'START' });
    playSound('timerStart');
  }, []);

  const pause = useCallback(() => {
    if (!isRunningRef.current) return;
    pausedTimeRef.current = elapsedMsRef.current;
    dispatch({ type: 'PAUSE' });
    playSound('hover');
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    pausedTimeRef.current = 0;
    elapsedMsRef.current = 0;
    lastLapTimeRef.current = 0;
  }, []);

  const lap = useCallback(() => {
    if (!isRunningRef.current) return;
    const currentElapsed = elapsedMsRef.current;
    const currentLastLap = lastLapTimeRef.current;
    const lapTime = currentElapsed - currentLastLap;
    const newLap: StopwatchLap = {
      id: generateId(),
      time: currentElapsed,
      lapTime,
    };
    lastLapTimeRef.current = currentElapsed;
    dispatch({ type: 'ADD_LAP', payload: newLap });
  }, []);

  const value = React.useMemo(
    () => ({ state, start, pause, reset, lap }),
    [state, start, pause, reset, lap],
  );

  return (
    <StopwatchContext.Provider value={value}>
      {children}
    </StopwatchContext.Provider>
  );
}

export function useStopwatchContext() {
  const context = useContext(StopwatchContext);
  if (!context) {
    throw new Error('useStopwatchContext must be used within a StopwatchProvider');
  }
  return context;
}