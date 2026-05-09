import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
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
  const elapsedMsRef = useRef<number>(0);
  const lastLapTimeRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);

  useEffect(() => {
    isRunningRef.current = state.isRunning;
  }, [state.isRunning]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      unlisten = await listen('stopwatch:tick', (event) => {
        const payload = event.payload as Record<string, unknown>;
        if (typeof payload.elapsedMs !== 'number') {
          console.error('Invalid stopwatch:tick payload', payload);
          return;
        }
        elapsedMsRef.current = payload.elapsedMs;
        dispatch({ type: 'TICK', payload: payload.elapsedMs });
      });
    };

    void setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    invoke('timer_start', { kind: { type: 'stopwatch' } })
      .then(() => {
        dispatch({ type: 'START' });
        playSound('timerStart');
      })
      .catch((error) => console.error('Failed to start stopwatch:', error));
  }, []);

  const pause = useCallback(() => {
    if (!isRunningRef.current) return;
    invoke('timer_pause')
      .then(() => {
        dispatch({ type: 'PAUSE' });
        playSound('hover');
      })
      .catch((error) => console.error('Failed to pause stopwatch:', error));
  }, []);

  const reset = useCallback(() => {
    invoke('timer_reset')
      .then(() => {
        dispatch({ type: 'RESET' });
        elapsedMsRef.current = 0;
        lastLapTimeRef.current = 0;
      })
      .catch((error) => console.error('Failed to reset stopwatch:', error));
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
