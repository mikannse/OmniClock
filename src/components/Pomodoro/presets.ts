import type { PomodoroSettings } from '../../types';

export interface PomodoroPreset {
  id: string;
  nameKey: string;
  descriptionKey: string;
  settings: PomodoroSettings;
}

export const pomodoroPresets: PomodoroPreset[] = [
  {
    id: 'classic',
    nameKey: 'pomodoro.presets.classic.name',
    descriptionKey: 'pomodoro.presets.classic.description',
    settings: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakInterval: 4,
    },
  },
  {
    id: 'deep-work',
    nameKey: 'pomodoro.presets.deepWork.name',
    descriptionKey: 'pomodoro.presets.deepWork.description',
    settings: {
      workMinutes: 50,
      shortBreakMinutes: 10,
      longBreakMinutes: 30,
      longBreakInterval: 2,
    },
  },
  {
    id: 'micro-pomodoro',
    nameKey: 'pomodoro.presets.micro.name',
    descriptionKey: 'pomodoro.presets.micro.description',
    settings: {
      workMinutes: 15,
      shortBreakMinutes: 3,
      longBreakMinutes: 10,
      longBreakInterval: 4,
    },
  },
];
