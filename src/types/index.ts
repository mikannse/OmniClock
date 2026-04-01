export interface TimerSegment {
  id: string;
  name: string;
  minutes: number;
}

export interface TimerConfig {
  id: string;
  name: string;
  totalMinutes: number;
  segments: TimerSegment[];
  createdAt: string;
}

export interface Settings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
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

export type ModuleType = 'timer' | 'pomodoro' | 'stopwatch' | 'countdown' | 'settings';

export interface StopwatchLap {
  id: string;
  time: number;
  lapTime: number;
}
