import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: '1分钟', value: 60 },
  { label: '5分钟', value: 300 },
  { label: '10分钟', value: 600 },
  { label: '15分钟', value: 900 },
  { label: '30分钟', value: 1800 },
  { label: '1小时', value: 3600 },
];

export function CountdownView() {
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    let interval: number | null = null;
    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStop = useCallback(() => {
    if (isEditing && timeLeft > 0) setIsEditing(false);
    setIsRunning((prev) => !prev);
  }, [isEditing, timeLeft]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    setIsEditing(true);
  }, [totalSeconds]);

  const adjustTime = (amount: number, unit: 'hours' | 'minutes' | 'seconds') => {
    if (!isEditing) return;
    let seconds = 0;
    if (unit === 'hours') seconds = amount * 3600;
    else if (unit === 'minutes') seconds = amount * 60;
    else seconds = amount;
    const newTime = Math.max(0, Math.min(86399, timeLeft + seconds));
    setTimeLeft(newTime);
    setTotalSeconds(newTime);
  };

  const setPreset = (value: number) => {
    if (!isEditing) return;
    setTimeLeft(value);
    setTotalSeconds(value);
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const isComplete = timeLeft === 0 && !isEditing;

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
              {isRunning ? '运行中' : isComplete ? '完成' : '已暂停'}
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
            <span className="text-xs text-muted-foreground">时</span>
            <Button variant="ghost" size="sm" onClick={() => adjustTime(-1, 'hours')} className="h-8 w-8 rounded-full">
              <Minus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => adjustTime(1, 'minutes')} className="h-8 w-8 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">分</span>
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
          onClick={handleReset}
          disabled={timeLeft === totalSeconds && isEditing}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="sr-only">重置</span>
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
          <span className="sr-only">{isRunning ? '暂停' : '开始'}</span>
        </Button>

        <div className="h-14 w-14" />
      </div>
    </div>
  );
}