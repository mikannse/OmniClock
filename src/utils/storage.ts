import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { TimerConfig, Settings, PomodoroSettings } from '../types';

const DATA_DIR = 'data';
const CONFIG_FILE = 'configs.json';
const SETTINGS_FILE = 'settings.json';
const POMODORO_FILE = 'pomodoro.json';

const defaultSettings: Settings = {
  notificationsEnabled: true,
  soundEnabled: true,
  theme: 'system',
};

const defaultPomodoroSettings: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

async function ensureDataDir() {
  try {
    const dirExists = await exists(DATA_DIR, { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await mkdir(DATA_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
    }
  } catch {
    // Directory might already exist
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
    return JSON.parse(content) as TimerConfig[];
  } catch (error) {
    console.error('Failed to load configs:', error);
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
    return { ...defaultSettings, ...JSON.parse(content) } as Settings;
  } catch (error) {
    console.error('Failed to load settings:', error);
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
    return { ...defaultPomodoroSettings, ...JSON.parse(content) } as PomodoroSettings;
  } catch (error) {
    console.error('Failed to load pomodoro settings:', error);
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
