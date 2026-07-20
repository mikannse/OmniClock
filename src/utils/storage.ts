import { BaseDirectory, exists, mkdir, readTextFile } from '@tauri-apps/plugin-fs';
import type {
  TimerConfig,
  TimerSegment,
  Settings,
  PomodoroSettings,
  TimerHistoryEntry,
} from '../types';
import { CURRENT_DATA_VERSION, migrate, wrapVersioned, writeFileAtomic } from './migration';

const DATA_DIR = 'data';
const CONFIG_FILE = 'configs.json';
const SETTINGS_FILE = 'settings.json';
const POMODORO_FILE = 'pomodoro.json';
const HISTORY_FILE = 'history.json';

function isValidTimerSegment(item: unknown): item is TimerSegment {
  if (!item || typeof item !== 'object') return false;
  const seg = item as Record<string, unknown>;
  return (
    typeof seg.id === 'string' &&
    typeof seg.name === 'string' &&
    typeof seg.minutes === 'number'
  );
}

function isValidTimerConfig(item: unknown): item is TimerConfig {
  if (!item || typeof item !== 'object') return false;
  const config = item as Record<string, unknown>;
  return (
    typeof config.id === 'string' &&
    typeof config.name === 'string' &&
    Array.isArray(config.segments) &&
    config.segments.every(isValidTimerSegment) &&
    typeof config.createdAt === 'string'
  );
}

const VALID_THEMES = ['light', 'dark', 'system'] as const;
const VALID_NOTIFICATION_MODES = ['banner', 'sound', 'tray', 'silent'] as const;

function isValidSettings(item: unknown): item is Settings {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.notificationsEnabled === 'boolean' &&
    typeof s.soundEnabled === 'boolean' &&
    typeof s.theme === 'string' &&
    VALID_THEMES.includes(s.theme as typeof VALID_THEMES[number]) &&
    typeof s.autostartEnabled === 'boolean' &&
    typeof s.closeToTray === 'boolean' &&
    typeof s.notificationMode === 'string' &&
    VALID_NOTIFICATION_MODES.includes(s.notificationMode as typeof VALID_NOTIFICATION_MODES[number])
  );
}

function isValidPomodoroSettings(item: unknown): item is PomodoroSettings {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.workMinutes === 'number' &&
    typeof s.shortBreakMinutes === 'number' &&
    typeof s.longBreakMinutes === 'number' &&
    typeof s.longBreakInterval === 'number'
  );
}

function isValidTimerHistorySegment(item: unknown): item is { name: string; plannedMinutes: number; actualSeconds: number } {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.name === 'string' &&
    typeof s.plannedMinutes === 'number' &&
    typeof s.actualSeconds === 'number'
  );
}

function isValidTimerHistoryEntry(item: unknown): item is TimerHistoryEntry {
  if (!item || typeof item !== 'object') return false;
  const e = item as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.configName === 'string' &&
    typeof e.startedAt === 'string' &&
    typeof e.completedAt === 'string' &&
    typeof e.totalElapsedSeconds === 'number' &&
    Array.isArray(e.segments) &&
    e.segments.every(isValidTimerHistorySegment)
  );
}

export const defaultSettings: Settings = {
  notificationsEnabled: true,
  soundEnabled: true,
  theme: 'system',
  autostartEnabled: false,
  closeToTray: false,
  notificationMode: 'banner',
};

const defaultPomodoroSettings: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

async function ensureDataDir() {
  const dirExists = await exists(DATA_DIR, { baseDir: BaseDirectory.AppData });
  if (!dirExists) {
    await mkdir(DATA_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
  }
}

async function loadJsonFile(filePath: string): Promise<unknown> {
  await ensureDataDir();
  const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
  if (!fileExists) {
    return null;
  }
  const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
  return JSON.parse(content);
}

async function handleLoadError<T>(error: unknown, fallback: T, fileName: string): Promise<T> {
  if (error instanceof SyntaxError) {
    console.error(`Corrupted ${fileName} JSON, returning fallback:`, error);
  } else {
    console.error(`Failed to load ${fileName}:`, error);
  }
  return fallback;
}

export async function loadConfigs(): Promise<TimerConfig[]> {
  try {
    const parsed = await loadJsonFile(`${DATA_DIR}/${CONFIG_FILE}`);
    if (parsed === null) return [];
    const result = migrate(
      parsed,
      {},
      (data): data is TimerConfig[] => Array.isArray(data) && data.every(isValidTimerConfig),
    );
    if (result === null) {
      console.error('Corrupted configs data structure, returning empty array');
      return [];
    }
    return result;
  } catch (error) {
    return handleLoadError(error, [], CONFIG_FILE);
  }
}

export async function saveConfigs(configs: TimerConfig[]): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${CONFIG_FILE}`;
    await writeFileAtomic(filePath, JSON.stringify(wrapVersioned(configs), null, 2));
  } catch (error) {
    console.error('Failed to save configs:', error);
    throw error;
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    const parsed = await loadJsonFile(`${DATA_DIR}/${SETTINGS_FILE}`);
    if (parsed === null) return defaultSettings;
    const result = migrate(
      parsed,
      {
        2: (data) => {
          if (!data || typeof data !== 'object') return defaultSettings;
          const s = data as Record<string, unknown>;
          return {
            ...defaultSettings,
            ...s,
            notificationMode: (s.notificationMode as Settings['notificationMode'] | undefined) ?? 'banner',
          };
        },
      },
      isValidSettings,
    );
    if (result === null) {
      console.error('Corrupted settings data structure, returning defaults');
      return defaultSettings;
    }
    return result;
  } catch (error) {
    return handleLoadError(error, defaultSettings, SETTINGS_FILE);
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${SETTINGS_FILE}`;
    await writeFileAtomic(filePath, JSON.stringify(wrapVersioned(settings), null, 2));
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

export async function loadPomodoroSettings(): Promise<PomodoroSettings> {
  try {
    const parsed = await loadJsonFile(`${DATA_DIR}/${POMODORO_FILE}`);
    if (parsed === null) return defaultPomodoroSettings;
    const result = migrate(
      parsed,
      {},
      isValidPomodoroSettings,
    );
    if (result === null) {
      console.error('Corrupted pomodoro settings data structure, returning defaults');
      return defaultPomodoroSettings;
    }
    return result;
  } catch (error) {
    return handleLoadError(error, defaultPomodoroSettings, POMODORO_FILE);
  }
}

export async function savePomodoroSettings(settings: PomodoroSettings): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${POMODORO_FILE}`;
    await writeFileAtomic(filePath, JSON.stringify(wrapVersioned(settings), null, 2));
  } catch (error) {
    console.error('Failed to save pomodoro settings:', error);
    throw error;
  }
}

export async function loadTimerHistory(): Promise<TimerHistoryEntry[]> {
  try {
    const parsed = await loadJsonFile(`${DATA_DIR}/${HISTORY_FILE}`);
    if (parsed === null) return [];
    const result = migrate(
      parsed,
      {},
      (data): data is TimerHistoryEntry[] => Array.isArray(data) && data.every(isValidTimerHistoryEntry),
    );
    if (result === null) {
      console.error('Corrupted timer history data structure, returning empty array');
      return [];
    }
    return result;
  } catch (error) {
    return handleLoadError(error, [], HISTORY_FILE);
  }
}

export async function saveTimerHistory(history: TimerHistoryEntry[]): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${HISTORY_FILE}`;
    await writeFileAtomic(filePath, JSON.stringify(wrapVersioned(history), null, 2));
  } catch (error) {
    console.error('Failed to save timer history:', error);
    throw error;
  }
}

export { CURRENT_DATA_VERSION };
