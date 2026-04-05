import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCountdownContext } from '../../contexts/CountdownContext';

const PRESETS = [60, 300, 600, 900, 1800, 3600];
const CIRCLE_RADIUS = 45;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function getTimeParts(totalSeconds: number) {
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function CountdownView() {
  const { t } = useTranslation();
  const { state, start, pause, reset, adjustTime, setTotalSeconds, setTimeLeft } = useCountdownContext();
  const { totalSeconds, timeLeft, isRunning, isEditing } = state;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const applyTime = (nextSeconds: number) => {
    const clamped = Math.max(0, Math.min(86399, nextSeconds));
    setTimeLeft(clamped);
    setTotalSeconds(clamped);
  };

  const setTimePart = (unit: 'hours' | 'minutes' | 'seconds', rawValue: string) => {
    if (!isEditing) {
      return;
    }

    const parts = getTimeParts(timeLeft);
    const numericValue = Number.parseInt(rawValue || '0', 10);
    const safeValue = Number.isNaN(numericValue) ? 0 : numericValue;

    if (unit === 'hours') {
      parts.hours = Math.max(0, Math.min(23, safeValue));
    } else if (unit === 'minutes') {
      parts.minutes = Math.max(0, Math.min(59, safeValue));
    } else {
      parts.seconds = Math.max(0, Math.min(59, safeValue));
    }

    applyTime(parts.hours * 3600 + parts.minutes * 60 + parts.seconds);
  };

  const handleStartStop = () => {
    if (isRunning) {
      pause();
      return;
    }

    start();
  };

  const setPreset = (value: number) => {
    if (!isEditing) {
      return;
    }

    applyTime(value);
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const isComplete = timeLeft === 0 && !isEditing;
  const timeParts = getTimeParts(timeLeft);

  const getStatusText = () => {
    if (isRunning) return t('common.running');
    if (isComplete) return t('common.complete');
    if (!isEditing) return t('common.paused');
    return t('common.ready');
  };

  const getPresetLabel = (value: number) => {
    if (value < 3600) {
      return t('countdown.presetMinutes', { count: value / 60 });
    }

    return t('countdown.presetHours', { count: value / 3600 });
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative h-64 w-64">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
          <circle
            cx="50"
            cy="50"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />
          <circle
            cx="50"
            cy="50"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={CIRCLE_CIRCUMFERENCE * (1 - progress / 100)}
            className={cn(
              'transition-all duration-1000 ease-linear',
              isComplete ? 'text-destructive' : 'text-primary',
            )}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={cn(
              'font-mono text-4xl font-light tracking-tight tabular-nums transition-colors md:text-5xl',
              isComplete ? 'animate-pulse text-destructive' : 'text-foreground',
            )}
          >
            {formatTime(timeLeft)}
          </div>
          <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
            {getStatusText()}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="w-full max-w-xl space-y-4 rounded-lg border border-border p-4">
          <div className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t('countdown.directInput')}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(['hours', 'minutes', 'seconds'] as const).map((unit) => (
              <div key={unit} className="space-y-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => adjustTime(1, unit)}
                  className="h-8 w-8 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <input
                  type="number"
                  min={0}
                  max={unit === 'hours' ? 23 : 59}
                  value={timeParts[unit]}
                  onChange={(event) => setTimePart(unit, event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg"
                />
                <div className="text-xs text-muted-foreground">{t(`countdown.${unit}`)}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => adjustTime(-1, unit)}
                  className="h-8 w-8 rounded-full"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditing && (
        <div className="flex flex-wrap justify-center gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              variant="outline"
              size="sm"
              onClick={() => setPreset(preset)}
              className={cn('text-xs', timeLeft === preset && 'bg-secondary')}
            >
              {getPresetLabel(preset)}
            </Button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full"
          onClick={reset}
          disabled={timeLeft === totalSeconds && isEditing}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="sr-only">{t('countdown.reset')}</span>
        </Button>

        <Button
          size="lg"
          className={cn(
            'h-20 w-20 rounded-full transition-all duration-300',
            isRunning ? 'bg-accent hover:bg-accent/90' : 'bg-primary hover:bg-primary/90',
          )}
          onClick={handleStartStop}
          disabled={timeLeft === 0}
        >
          {isRunning ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
          <span className="sr-only">{isRunning ? t('countdown.pause') : t('countdown.start')}</span>
        </Button>

        <div className="h-14 w-14" />
      </div>
    </div>
  );
}
