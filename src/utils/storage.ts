import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { TimerConfig, TimerSegment, Settings, PomodoroSettings } from '../types';

const DATA_DIR = 'data';
const CONFIG_FILE = 'configs.json';
const SETTINGS_FILE = 'settings.json';
const POMODORO_FILE = 'pomodoro.json';

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

function isValidSettings(item: unknown): item is Settings {
  if (!item || typeof item !== 'object') return false;
  const s = item as Record<string, unknown>;
  return (
    typeof s.notificationsEnabled === 'boolean' &&
    typeof s.soundEnabled === 'boolean' &&
    typeof s.theme === 'string' &&
    VALID_THEMES.includes(s.theme as typeof VALID_THEMES[number]) &&
    typeof s.autostartEnabled === 'boolean' &&
    typeof s.closeToTray === 'boolean'
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

const defaultSettings: Settings = {
  notificationsEnabled: true,
  soundEnabled: true,
  theme: 'system',
  autostartEnabled: false,
  closeToTray: false,
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

export async function loadConfigs(): Promise<TimerConfig[]> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${CONFIG_FILE}`;
    const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
    if (!fileExists) {
      return [];
    }
    const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.every(isValidTimerConfig)) {
      return parsed;
    }
    console.error('Corrupted configs data structure, returning empty array');
    return [];
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Corrupted configs JSON, returning empty array:', error);
    } else {
      console.error('Failed to load configs:', error);
    }
    return [];
  }
}

export async function saveConfigs(configs: TimerConfig[]): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${CONFIG_FILE}`;
    await writeTextFile(filePath, JSON.stringify(configs, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (error) {
    console.error('Failed to save configs:', error);
    throw error;
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${SETTINGS_FILE}`;
    const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
    if (!fileExists) {
      return defaultSettings;
    }
    const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
    const parsed = JSON.parse(content);
    if (isValidSettings(parsed)) {
      return { ...defaultSettings, ...parsed };
    }
    console.error('Corrupted settings data structure, returning defaults');
    return defaultSettings;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Corrupted settings JSON, returning defaults:', error);
    } else {
      console.error('Failed to load settings:', error);
    }
    return defaultSettings;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${SETTINGS_FILE}`;
    await writeTextFile(filePath, JSON.stringify(settings, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

export async function loadPomodoroSettings(): Promise<PomodoroSettings> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${POMODORO_FILE}`;
    const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData });
    if (!fileExists) {
      return defaultPomodoroSettings;
    }
    const content = await readTextFile(filePath, { baseDir: BaseDirectory.AppData });
    const parsed = JSON.parse(content);
    if (isValidPomodoroSettings(parsed)) {
      return { ...defaultPomodoroSettings, ...parsed };
    }
    console.error('Corrupted pomodoro settings data structure, returning defaults');
    return defaultPomodoroSettings;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Corrupted pomodoro settings JSON, returning defaults:', error);
    } else {
      console.error('Failed to load pomodoro settings:', error);
    }
    return defaultPomodoroSettings;
  }
}

export async function savePomodoroSettings(settings: PomodoroSettings): Promise<void> {
  try {
    await ensureDataDir();
    const filePath = `${DATA_DIR}/${POMODORO_FILE}`;
    await writeTextFile(filePath, JSON.stringify(settings, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (error) {
    console.error('Failed to save pomodoro settings:', error);
    throw error;
  }
}
