import type { TimerConfig } from '../../types';

export interface TimerPreset {
  id: string;
  nameKey: string;
  descriptionKey: string;
  tags: string[];
  segments: { nameKey: string; minutes: number }[];
}

export const timerPresets: TimerPreset[] = [
  {
    id: 'exam-simulation',
    nameKey: 'timer.presets.examSimulation.name',
    descriptionKey: 'timer.presets.examSimulation.description',
    tags: ['study', 'exam'],
    segments: [
      { nameKey: 'timer.presets.examSimulation.multipleChoice', minutes: 30 },
      { nameKey: 'timer.presets.examSimulation.shortAnswer', minutes: 45 },
      { nameKey: 'timer.presets.examSimulation.essay', minutes: 60 },
    ],
  },
  {
    id: 'presentation-practice',
    nameKey: 'timer.presets.presentationPractice.name',
    descriptionKey: 'timer.presets.presentationPractice.description',
    tags: ['speaking', 'practice'],
    segments: [
      { nameKey: 'timer.presets.presentationPractice.opening', minutes: 5 },
      { nameKey: 'timer.presets.presentationPractice.body', minutes: 15 },
      { nameKey: 'timer.presets.presentationPractice.qa', minutes: 10 },
    ],
  },
  {
    id: 'writing-sprint',
    nameKey: 'timer.presets.writingSprint.name',
    descriptionKey: 'timer.presets.writingSprint.description',
    tags: ['writing', 'focus'],
    segments: [
      { nameKey: 'timer.presets.writingSprint.outline', minutes: 10 },
      { nameKey: 'timer.presets.writingSprint.drafting', minutes: 35 },
      { nameKey: 'timer.presets.writingSprint.review', minutes: 15 },
    ],
  },
];

export function buildTimerConfigFromPreset(
  preset: TimerPreset,
  translate: (key: string) => string,
): Omit<TimerConfig, 'id' | 'createdAt'> {
  return {
    name: translate(preset.nameKey),
    segments: preset.segments.map((segment) => ({
      id: crypto.randomUUID(),
      name: translate(segment.nameKey),
      minutes: segment.minutes,
    })),
  };
}
