export interface TimerSegment {
  id: string;
  name: string;
  minutes: number;
}

export interface TimerConfig {
  id: string;
  name: string;
  segments: TimerSegment[];
  createdAt: string;
}

export type NotificationMode = 'banner' | 'sound' | 'tray' | 'silent';

export interface Settings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  autostartEnabled: boolean;
  closeToTray: boolean;
  notificationMode: NotificationMode;
}

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  status: TimerStatus;
  currentSegmentIndex: number;
  remainingSeconds: number;
  totalElapsedSeconds: number;
}

export interface PomodoroSettings {
  workMinutes: number;      // 工作时长 (默认25)
  shortBreakMinutes: number; // 短休息时长 (默认5)
  longBreakMinutes: number;  // 长休息时长 (默认15)
  longBreakInterval: number; // 长休息间隔次数 (默认4)
}

export interface PomodoroState {
  status: 'idle' | 'working' | 'shortBreak' | 'longBreak';
  completedPomodoros: number; // 已完成的番茄钟数
  remainingSeconds: number;
  totalElapsedSeconds: number;
}

export type ModuleType = 'dashboard' | 'timer' | 'pomodoro' | 'stopwatch' | 'countdown' | 'settings';

export interface TimerHistorySegment {
  name: string;
  plannedMinutes: number;
  actualSeconds: number;
}

export interface TimerHistoryEntry {
  id: string;
  configName: string;
  startedAt: string;
  completedAt: string;
  totalElapsedSeconds: number;
  segments: TimerHistorySegment[];
}

export interface StopwatchLap {
  id: string;
  time: number;
  lapTime: number;
}
