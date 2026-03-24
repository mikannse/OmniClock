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
}

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  status: TimerStatus;
  currentSegmentIndex: number;
  remainingSeconds: number;
  totalElapsedSeconds: number;
}

export type ModuleType = 'timer' | 'stopwatch' | 'countdown' | 'settings';

export interface StopwatchLap {
  id: string;
  time: number;
  lapTime: number;
}
