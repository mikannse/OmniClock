import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { message } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type {
  Settings,
  TimerConfig,
  TimerHistoryEntry,
  TimerHistorySegment,
  TimerState,
  TimerStatus,
} from '../types';
import { setAutostart } from '../utils/autostart';
import { notify, playAlertSound } from '../utils/notification';
import {
  defaultSettings,
  loadConfigs,
  loadSettings,
  loadTimerHistory,
  saveConfigs,
  saveSettings,
  saveTimerHistory,
} from '../utils/storage';
import { generateId, minutesToSeconds } from '../utils/time';

interface TimerContextType {
  configs: TimerConfig[];
  settings: Settings;
  timerState: TimerState;
  activeConfig: TimerConfig | null;
  history: TimerHistoryEntry[];
  warning: boolean;
  addConfig: (config: Omit<TimerConfig, 'id' | 'createdAt'>) => Promise<void>;
  updateConfig: (id: string, config: Partial<TimerConfig>) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  deleteHistoryEntry: (id: string) => Promise<void>;
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
  | { type: 'SET_HISTORY'; payload: TimerHistoryEntry[] }
  | { type: 'ADD_HISTORY'; payload: TimerHistoryEntry }
  | { type: 'DELETE_HISTORY'; payload: string }
  | { type: 'START_TIMER'; payload: { config: TimerConfig; initialSeconds: number; startedAt: number } }
  | { type: 'TICK'; payload: { remainingSeconds: number; totalElapsedSeconds: number; currentSegmentIndex: number; warning: boolean } }
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
  history: TimerHistoryEntry[];
  warning: boolean;
  startedAt: number | null;
};

const initialState: TimerContextState = {
  configs: [],
  settings: defaultSettings,
  activeConfig: null,
  history: [],
  status: 'idle',
  currentSegmentIndex: 0,
  remainingSeconds: 0,
  totalElapsedSeconds: 0,
  warning: false,
  startedAt: null,
};

const CLOSE_TO_TRAY_HINT_KEY = 'close_to_tray_hint_shown';

function timerReducer(state: TimerContextState, action: TimerAction): TimerContextState {
  switch (action.type) {
    case 'SET_CONFIGS':
      return { ...state, configs: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_HISTORY':
      return { ...state, history: action.payload };
    case 'ADD_HISTORY':
      return { ...state, history: [action.payload, ...state.history] };
    case 'DELETE_HISTORY':
      return { ...state, history: state.history.filter((entry) => entry.id !== action.payload) };
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
        currentSegmentIndex: action.payload.currentSegmentIndex,
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
  const configsRef = useRef<TimerConfig[]>([]);
  configsRef.current = state.configs;
  const statusRef = useRef<TimerStatus>('idle');
  const activeConfigRef = useRef<TimerConfig | null>(null);
  const timerIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const segmentStartTotalElapsedRef = useRef<number>(0);
  const segmentActualsRef = useRef<TimerHistorySegment[]>([]);
  const settingsRef = useRef<Settings>(state.settings);
  settingsRef.current = state.settings;
  const historyRef = useRef<TimerHistoryEntry[]>(state.history);
  historyRef.current = state.history;
  const totalElapsedRef = useRef<number>(state.totalElapsedSeconds);
  totalElapsedRef.current = state.totalElapsedSeconds;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    activeConfigRef.current = state.activeConfig;
  }, [state.activeConfig]);

  useEffect(() => {
    startedAtRef.current = state.startedAt;
  }, [state.startedAt]);

  useEffect(() => {
    totalElapsedRef.current = state.totalElapsedSeconds;
  }, [state.totalElapsedSeconds]);

  useEffect(() => {
    historyRef.current = state.history;
  }, [state.history]);

  useEffect(() => {
    void loadConfigs().then((configs) => dispatch({ type: 'SET_CONFIGS', payload: configs }));
    void loadSettings().then((settings) => {
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      void setAutostart(settings.autostartEnabled).catch(console.error);
      void invoke('set_close_to_tray', { value: settings.closeToTray }).catch(console.error);
    });
    void loadTimerHistory().then((history) => dispatch({ type: 'SET_HISTORY', payload: history }));
  }, []);

  const persistHistory = useCallback(async (history: TimerHistoryEntry[]) => {
    try {
      await saveTimerHistory(history);
    } catch {
      toast.error(tRef.current('common.saveFailed'));
    }
  }, []);

  useEffect(() => {
    let unlistenTick: (() => void) | undefined;
    let unlistenTransition: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenTick = await listen('timer:tick', (event) => {
        const payload = event.payload as {
          timerId: string;
          remainingSeconds: number;
          totalElapsedSeconds: number;
          currentSegmentIndex: number;
          warning: boolean;
        };
        if (payload.timerId !== timerIdRef.current) return;
        dispatch({
          type: 'TICK',
          payload,
        });
      });

      unlistenTransition = await listen('timer:transition', (event) => {
        const payload = event.payload as Record<string, unknown>;
        if (payload.timerId !== timerIdRef.current) return;

        if (payload.type === 'segment_end') {
          const currentSegmentIndex = typeof payload.currentSegmentIndex === 'number'
            ? payload.currentSegmentIndex
            : undefined;
          const remainingSeconds = typeof payload.remainingSeconds === 'number'
            ? payload.remainingSeconds
            : undefined;
          const totalElapsedSeconds = typeof payload.totalElapsedSeconds === 'number'
            ? payload.totalElapsedSeconds
            : undefined;

          if (currentSegmentIndex !== undefined && remainingSeconds !== undefined && totalElapsedSeconds !== undefined) {
            dispatch({
              type: 'TICK',
              payload: {
                remainingSeconds,
                totalElapsedSeconds,
                currentSegmentIndex,
                warning: false,
              },
            });
          }

          const config = activeConfigRef.current;
          if (config && currentSegmentIndex !== undefined && totalElapsedSeconds !== undefined) {
            const completedIndex = currentSegmentIndex - 1;
            const completedSegment = config.segments[completedIndex];
            const nextSegment = config.segments[currentSegmentIndex];

            if (completedSegment) {
              const actualSeconds = Math.max(
                0,
                Math.floor(totalElapsedSeconds - segmentStartTotalElapsedRef.current),
              );
              segmentActualsRef.current.push({
                name: completedSegment.name,
                plannedMinutes: completedSegment.minutes,
                actualSeconds,
              });
            }

            segmentStartTotalElapsedRef.current = totalElapsedSeconds;

            if (nextSegment) {
              void notify(
                tRef.current('timer.notifications.segmentCompleteTitle', { segment: completedSegment?.name ?? '' }),
                tRef.current('timer.notifications.segmentCompleteBody', { segment: nextSegment.name }),
                settingsRef.current.notificationMode,
                'segmentEnd',
                settingsRef.current.soundEnabled,
                settingsRef.current.notificationsEnabled,
              );
            }
          }
        } else if (payload.type === 'timer_end') {
          const config = activeConfigRef.current;
          const completedAt = new Date().toISOString();
          const totalElapsedSeconds = typeof payload.totalElapsedSeconds === 'number'
            ? payload.totalElapsedSeconds
            : totalElapsedRef.current;

          if (config) {
            const lastIndex = config.segments.length - 1;
            const lastSegment = config.segments[lastIndex];
            if (lastSegment) {
              const actualSeconds = Math.max(
                0,
                Math.floor(totalElapsedSeconds - segmentStartTotalElapsedRef.current),
              );
              segmentActualsRef.current.push({
                name: lastSegment.name,
                plannedMinutes: lastSegment.minutes,
                actualSeconds,
              });
            }

            const startedAt = startedAtRef.current ?? Date.now();
            const entry: TimerHistoryEntry = {
              id: generateId(),
              configName: config.name,
              startedAt: new Date(startedAt).toISOString(),
              completedAt,
              totalElapsedSeconds,
              segments: segmentActualsRef.current,
            };
            const newHistory = [entry, ...historyRef.current];
            dispatch({ type: 'ADD_HISTORY', payload: entry });
            void persistHistory(newHistory);
          }

          void notify(
            tRef.current('timer.notifications.completeTitle'),
            tRef.current('timer.notifications.completeBody'),
            settingsRef.current.notificationMode,
            'timerEnd',
            settingsRef.current.soundEnabled,
            settingsRef.current.notificationsEnabled,
          );
          dispatch({ type: 'TIMER_END' });
        }
      });
    };

    void setupListeners();

    return () => {
      if (unlistenTick) unlistenTick();
      if (unlistenTransition) unlistenTransition();
    };
  }, [persistHistory]);

  const addConfig = useCallback(
    async (config: Omit<TimerConfig, 'id' | 'createdAt'>) => {
      const newConfig: TimerConfig = {
        ...config,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const newConfigs = [...configsRef.current, newConfig];
      try {
        await saveConfigs(newConfigs);
        dispatch({ type: 'SET_CONFIGS', payload: newConfigs });
      } catch {
        toast.error(t('common.saveFailed'));
      }
    },
    [t],
  );

  const updateConfig = useCallback(
    async (id: string, config: Partial<TimerConfig>) => {
      const newConfigs = configsRef.current.map((currentConfig) => {
        if (currentConfig.id !== id) {
          return currentConfig;
        }
        return { ...currentConfig, ...config };
      });

      try {
        await saveConfigs(newConfigs);
        dispatch({ type: 'SET_CONFIGS', payload: newConfigs });
      } catch {
        toast.error(t('common.saveFailed'));
      }
    },
    [t],
  );

  const deleteConfig = useCallback(
    async (id: string) => {
      const newConfigs = configsRef.current.filter((config) => config.id !== id);
      try {
        await saveConfigs(newConfigs);
        dispatch({ type: 'SET_CONFIGS', payload: newConfigs });
      } catch {
        toast.error(t('common.saveFailed'));
      }
    },
    [t],
  );

  const deleteHistoryEntry = useCallback(
    async (id: string) => {
      const newHistory = state.history.filter((entry) => entry.id !== id);
      try {
        await saveTimerHistory(newHistory);
        dispatch({ type: 'DELETE_HISTORY', payload: id });
      } catch {
        toast.error(t('common.saveFailed'));
      }
    },
    [state.history, t],
  );

  const startTimer = useCallback(
    (configId: string) => {
      if (statusRef.current === 'running') return;
      const config = configsRef.current.find((item) => item.id === configId);
      if (!config || config.segments.length === 0) {
        return;
      }

      const seconds = minutesToSeconds(config.segments[0].minutes);
      const now = Date.now();
      timerIdRef.current = config.id;
      segmentActualsRef.current = [];
      segmentStartTotalElapsedRef.current = 0;

      invoke('timer_start', { id: config.id, kind: { type: 'segmented', config } })
        .then(() => {
          dispatch({
            type: 'START_TIMER',
            payload: { config, initialSeconds: seconds, startedAt: now },
          });
          void playAlertSound('timerStart', settingsRef.current.soundEnabled);
        })
        .catch((error) => {
          console.error('Failed to start timer:', error);
        });
    },
    [],
  );

  const pauseTimer = useCallback(() => {
    if (statusRef.current !== 'running') return;
    const id = timerIdRef.current;
    if (!id) return;
    invoke('timer_pause', { id })
      .then(() => dispatch({ type: 'PAUSE' }))
      .catch((error) => console.error('Failed to pause timer:', error));
  }, []);

  const resumeTimer = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    const id = timerIdRef.current;
    if (!id) return;
    invoke('timer_resume', { id })
      .then(() => dispatch({ type: 'RESUME' }))
      .catch((error) => console.error('Failed to resume timer:', error));
  }, []);

  const resetTimer = useCallback(() => {
    const id = timerIdRef.current;
    if (!id) return;
    invoke('timer_reset', { id })
      .then(() => {
        dispatch({ type: 'RESET' });
        timerIdRef.current = null;
      })
      .catch((error) => console.error('Failed to reset timer:', error));
  }, []);

  const jumpToSegment = useCallback(
    (segmentIndex: number) => {
      const config = activeConfigRef.current;
      if (!config) return;

      const segment = config.segments[segmentIndex];
      if (!segment) return;

      const id = timerIdRef.current;
      if (!id) return;
      invoke('timer_jump_segment', { id, index: segmentIndex })
        .then(() => {
          const seconds = minutesToSeconds(segment.minutes);
          const now = Date.now();
          segmentStartTotalElapsedRef.current = totalElapsedRef.current;
          dispatch({
            type: 'JUMP_TO_SEGMENT',
            payload: { segmentIndex, seconds, startedAt: now },
          });
        })
        .catch((error) => console.error('Failed to jump segment:', error));
    },
    [],
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<Settings>) => {
      const updatedSettings = { ...state.settings, ...newSettings };
      try {
        await saveSettings(updatedSettings);
      } catch {
        toast.error(t('common.saveFailed'));
        return;
      }

      if (newSettings.autostartEnabled !== undefined) {
        try {
          await setAutostart(newSettings.autostartEnabled);
        } catch {
          toast.error(t('common.saveFailed'));
        }
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

  const value = React.useMemo(
    () => ({
      configs: state.configs,
      settings: state.settings,
      timerState: {
        status: state.status,
        currentSegmentIndex: state.currentSegmentIndex,
        remainingSeconds: state.remainingSeconds,
        totalElapsedSeconds: state.totalElapsedSeconds,
      },
      activeConfig: state.activeConfig,
      history: state.history,
      warning: state.warning,
      addConfig,
      updateConfig,
      deleteConfig,
      deleteHistoryEntry,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      jumpToSegment,
      updateSettings,
    }),
    [
      state.configs,
      state.settings,
      state.status,
      state.currentSegmentIndex,
      state.remainingSeconds,
      state.totalElapsedSeconds,
      state.activeConfig,
      state.history,
      state.warning,
      addConfig,
      updateConfig,
      deleteConfig,
      deleteHistoryEntry,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      jumpToSegment,
      updateSettings,
    ],
  );

  return (
    <TimerContext.Provider value={value}>
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
