import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { message } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { Settings, TimerConfig, TimerState, TimerStatus } from '../types';
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

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    activeConfigRef.current = state.activeConfig;
  }, [state.activeConfig]);

  useEffect(() => {
    void loadConfigs().then((configs) => dispatch({ type: 'SET_CONFIGS', payload: configs }));
    void loadSettings().then((settings) => {
      dispatch({ type: 'SET_SETTINGS', payload: settings });
      void setAutostart(settings.autostartEnabled).catch(console.error);
      void invoke('set_close_to_tray', { value: settings.closeToTray }).catch(console.error);
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

  useEffect(() => {
    let unlistenTick: (() => void) | undefined;
    let unlistenTransition: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenTick = await listen('timer:tick', (event) => {
        const payload = event.payload as {
          remainingSeconds: number;
          totalElapsedSeconds: number;
          currentSegmentIndex: number;
          warning: boolean;
        };
        dispatch({
          type: 'TICK',
          payload,
        });
      });

      unlistenTransition = await listen('timer:transition', (event) => {
        const payload = event.payload as Record<string, unknown>;

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
          if (config && currentSegmentIndex !== undefined) {
            const completedIndex = currentSegmentIndex - 1;
            const completedSegment = config.segments[completedIndex];
            const nextSegment = config.segments[currentSegmentIndex];
            if (completedSegment && nextSegment) {
              playTimerSound('segmentEnd');
              void showNotification(
                t('timer.notifications.segmentCompleteTitle', {
                  segment: completedSegment.name,
                }),
                t('timer.notifications.segmentCompleteBody', { segment: nextSegment.name }),
              );
            }
          }
        } else if (payload.type === 'timer_end') {
          playTimerSound('timerEnd');
          void showNotification(
            t('timer.notifications.completeTitle'),
            t('timer.notifications.completeBody'),
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
  }, [playTimerSound, showNotification, t]);

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

  const startTimer = useCallback(
    (configId: string) => {
      if (statusRef.current === 'running') return;
      const config = configsRef.current.find((item) => item.id === configId);
      if (!config || config.segments.length === 0) {
        return;
      }

      const seconds = minutesToSeconds(config.segments[0].minutes);
      const now = Date.now();

      invoke('timer_start', { kind: { type: 'segmented', config } })
        .then(() => {
          dispatch({
            type: 'START_TIMER',
            payload: { config, initialSeconds: seconds, startedAt: now },
          });
          playTimerSound('timerStart');
        })
        .catch((error) => {
          console.error('Failed to start timer:', error);
        });
    },
    [playTimerSound],
  );

  const pauseTimer = useCallback(() => {
    if (statusRef.current !== 'running') return;
    invoke('timer_pause')
      .then(() => dispatch({ type: 'PAUSE' }))
      .catch((error) => console.error('Failed to pause timer:', error));
  }, []);

  const resumeTimer = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    invoke('timer_resume')
      .then(() => dispatch({ type: 'RESUME' }))
      .catch((error) => console.error('Failed to resume timer:', error));
  }, []);

  const resetTimer = useCallback(() => {
    invoke('timer_reset')
      .then(() => dispatch({ type: 'RESET' }))
      .catch((error) => console.error('Failed to reset timer:', error));
  }, []);

  const jumpToSegment = useCallback(
    (segmentIndex: number) => {
      const config = activeConfigRef.current;
      if (!config) {
        return;
      }

      const segment = config.segments[segmentIndex];
      if (!segment) {
        return;
      }

      invoke('timer_jump_segment', { index: segmentIndex })
        .then(() => {
          const seconds = minutesToSeconds(segment.minutes);
          const now = Date.now();
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
    }),
    [
      state.configs,
      state.settings,
      state.status,
      state.currentSegmentIndex,
      state.remainingSeconds,
      state.totalElapsedSeconds,
      state.activeConfig,
      state.warning,
      addConfig,
      updateConfig,
      deleteConfig,
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
