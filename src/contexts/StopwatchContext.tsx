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
  | { type: 'ADD_LAP'; payload: StopwatchLap }
  | { type: 'SET_ELAPSED'; payload: number }
  | { type: 'SET_LAST_LAP_TIME'; payload: number };

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
      return { ...state, laps: [action.payload, ...state.laps] };
    case 'SET_ELAPSED':
      return { ...state, elapsedMs: action.payload };
    case 'SET_LAST_LAP_TIME':
      return { ...state, lastLapTime: action.payload };
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
    if (state.isRunning) return;
    startTimeRef.current = Date.now();
    dispatch({ type: 'START' });
    playSound('timerStart');
  }, [state.isRunning]);

  const pause = useCallback(() => {
    if (!state.isRunning) return;
    pausedTimeRef.current = state.elapsedMs;
    dispatch({ type: 'PAUSE' });
    playSound('hover');
  }, [state.isRunning, state.elapsedMs]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    pausedTimeRef.current = 0;
    elapsedMsRef.current = 0;
    lastLapTimeRef.current = 0;
  }, []);

  const lap = useCallback(() => {
    if (!state.isRunning) return;
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
    dispatch({ type: 'SET_LAST_LAP_TIME', payload: currentElapsed });
  }, [state.isRunning]);

  return (
    <StopwatchContext.Provider value={{ state, start, pause, reset, lap }}>
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