import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountdownContext } from '../../contexts/CountdownContext';

const PRESETS = [
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
  { label: '30 min', value: 1800 },
  { label: '1 hour', value: 3600 },
];

export function CountdownView() {
  const { t } = useTranslation();
  const { state, start, pause, reset, adjustTime, setTotalSeconds, setTimeLeft } = useCountdownContext();
  const { totalSeconds, timeLeft, isRunning, isEditing } = state;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  };

  const setPreset = (value: number) => {
    if (!isEditing) return;
    setTimeLeft(value);
    setTotalSeconds(value);
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const isComplete = timeLeft === 0 && !isEditing;

  const getStatusText = () => {
    if (isRunning) return 'Running';
    if (isComplete) return 'Complete';
    if (!isEditing) return 'Paused';
    return 'Ready';
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Circular Progress */}
      <div className="relative h-64 w-64">
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            className={cn(
              "transition-all duration-1000 ease-linear",
              isComplete ? "text-destructive" : "text-primary"
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={cn(
              "font-mono text-4xl md:text-5xl font-light tracking-tight tabular-nums transition-colors",
              isComplete ? "text-destructive animate-pulse" : "text-foreground"
            )}
          >
            {formatTime(timeLeft)}
          </div>
          {!isEditing && (
            <div className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">
              {getStatusText()}
            </div>
          )}
        </div>
      </div>

      {/* Time Adjusters (only when editing) */}
      {isEditing && (
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => adjustTime(1, 'hours')} className="h-8 w-8 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{t('countdown.hours')}</span>
            <Button variant="ghost" size="sm" onClick={() => adjustTime(-1, 'hours')} className="h-8 w-8 rounded-full">
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => adjustTime(1, 'minutes')} className="h-8 w-8 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">{t('countdown.minutes')}</span>
            <Button variant="ghost" size="sm" onClick={() => adjustTime(-1, 'minutes')} className="h-8 w-8 rounded-full">
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Presets */}
      {isEditing && (
        <div className="flex flex-wrap justify-center gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size="sm"
              onClick={() => setPreset(preset.value)}
              className={cn(
                "text-xs",
                timeLeft === preset.value && "bg-secondary"
              )}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      )}

      {/* Controls */}
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
            "h-20 w-20 rounded-full transition-all duration-300",
            isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
          )}
          onClick={handleStartStop}
          disabled={timeLeft === 0 && !isEditing}
        >
          {isRunning ? (
            <Pause className="h-8 w-8" />
          ) : (
            <Play className="h-8 w-8 ml-1" />
          )}
          <span className="sr-only">{isRunning ? t('countdown.pause') : t('countdown.start')}</span>
        </Button>

        <div className="h-14 w-14" />
      </div>
    </div>
  );
}