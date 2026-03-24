import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { generateId } from '../../utils/time';
import type { StopwatchLap } from '../../types';
import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StopwatchView() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [laps, setLaps] = useState<StopwatchLap[]>([]);
  const [lastLapTime, setLastLapTime] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setLaps([]);
    setLastLapTime(0);
  };
  const handleLap = () => {
    if (!isRunning) return;
    const lapTime = elapsedSeconds - lastLapTime;
    const newLap: StopwatchLap = {
      id: generateId(),
      time: elapsedSeconds,
      lapTime,
    };
    setLaps((prev) => [newLap, ...prev]);
    setLastLapTime(elapsedSeconds);
  };

  const formatMs = (ms: number) => {
    const totalMs = ms * 1000;
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const centiseconds = 0;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const getBestWorst = () => {
    if (laps.length < 2) return { best: -1, worst: -1 };
    const withIndex = laps.map((lap, i) => ({ i, lapTime: lap.lapTime }));
    const sorted = [...withIndex].sort((a, b) => a.lapTime - b.lapTime);
    return { best: sorted[0].i, worst: sorted[sorted.length - 1].i };
  };

  const { best, worst } = getBestWorst();

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Display */}
      <div className="text-center">
        <div className="font-mono text-5xl md:text-7xl font-light tracking-tight text-foreground tabular-nums">
          {formatMs(elapsedSeconds)}
        </div>
        <div className="mt-2 text-xs text-muted-foreground uppercase tracking-widest">
          {isRunning ? '运行中' : elapsedSeconds > 0 ? '已暂停' : '准备就绪'}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full"
          onClick={elapsedSeconds > 0 && !isRunning ? handleReset : handleLap}
          disabled={elapsedSeconds === 0}
        >
          {elapsedSeconds > 0 && !isRunning ? (
            <RotateCcw className="h-5 w-5" />
          ) : (
            <Flag className="h-5 w-5" />
          )}
          <span className="sr-only">{elapsedSeconds > 0 && !isRunning ? '重置' : '计圈'}</span>
        </Button>

        <Button
          size="lg"
          className={cn(
            "h-20 w-20 rounded-full transition-all duration-300",
            isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
          )}
          onClick={isRunning ? handlePause : handleStart}
        >
          {isRunning ? (
            <Pause className="h-8 w-8" />
          ) : (
            <Play className="h-8 w-8 ml-1" />
          )}
          <span className="sr-only">{isRunning ? '暂停' : '开始'}</span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full"
          onClick={handleReset}
          disabled={elapsedSeconds === 0}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="sr-only">重置</span>
        </Button>
      </div>

      {/* Laps */}
      {laps.length > 0 && (
        <div className="w-full max-w-md">
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">圈数</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">圈时</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">总时</th>
                </tr>
              </thead>
              <tbody>
                {laps.map((lap, index) => (
                  <tr
                    key={lap.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      index === best && laps.length > 1 && "text-green-600",
                      index === worst && laps.length > 1 && "text-muted-foreground"
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-medium">第 {lap.id} 圈</td>
                    <td className="px-4 py-3 text-sm font-mono text-right tabular-nums">{formatMs(lap.lapTime)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right tabular-nums text-muted-foreground">{formatMs(lap.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}