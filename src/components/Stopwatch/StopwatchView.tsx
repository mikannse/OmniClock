import { Flag, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useStopwatchContext } from '../../contexts/StopwatchContext';

export function StopwatchView() {
  const { t } = useTranslation();
  const { state, start, pause, reset, lap } = useStopwatchContext();
  const { isRunning, elapsedMs, laps } = state;

  const formatTime = (ms: number) => {
    const totalMs = Math.floor(ms);
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const centiseconds = Math.floor((totalMs % 1000) / 10);

    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const getBestWorst = () => {
    if (laps.length < 2) {
      return { best: -1, worst: -1 };
    }

    const withIndex = laps.map((lapItem, index) => ({ index, lapTime: lapItem.lapTime }));
    const sorted = [...withIndex].sort((left, right) => left.lapTime - right.lapTime);

    return { best: sorted[0].index, worst: sorted[sorted.length - 1].index };
  };

  const getStatusText = () => {
    if (isRunning) return t('common.running');
    if (elapsedMs > 0) return t('common.paused');
    return t('common.ready');
  };

  const { best, worst } = getBestWorst();
  const [isPreparing, setIsPreparing] = useState(false);
  const spacePressedAtRef = useRef<number | null>(null);
  const stateRef = useRef({ isRunning, elapsedMs });
  stateRef.current = { isRunning, elapsedMs };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (spacePressedAtRef.current !== null) return;
      spacePressedAtRef.current = Date.now();
      const { isRunning: running, elapsedMs: elapsed } = stateRef.current;
      if (!running && elapsed === 0) {
        setIsPreparing(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (spacePressedAtRef.current === null) return;
      const duration = Date.now() - spacePressedAtRef.current;
      spacePressedAtRef.current = null;
      setIsPreparing(false);
      const { isRunning: running, elapsedMs: elapsed } = stateRef.current;
      if (!running && elapsed === 0) {
        start();
      } else if (duration < 500) {
        if (running) {
          pause();
        } else {
          start();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [start, pause]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8">
      <div className="text-center">
        <div className="font-mono text-5xl font-light tracking-tight tabular-nums text-foreground md:text-7xl">
          {formatTime(elapsedMs)}
        </div>
        <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{getStatusText()}</div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full"
          onClick={lap}
          disabled={elapsedMs === 0}
        >
          <Flag className="h-5 w-5" />
          <span className="sr-only">{t('stopwatch.lap')}</span>
        </Button>

        <Button
          size="lg"
          className={cn(
            'h-20 w-20 rounded-full transition-all duration-300',
            isRunning ? 'bg-accent hover:bg-accent/90' : 'bg-primary hover:bg-primary/90',
            isPreparing && 'scale-95 ring-4 ring-primary/30',
          )}
          onClick={isRunning ? pause : start}
        >
          {isRunning ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
          <span className="sr-only">{isRunning ? t('timer.pause') : t('timer.start')}</span>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full"
          onClick={reset}
          disabled={elapsedMs === 0}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="sr-only">{t('stopwatch.reset')}</span>
        </Button>
      </div>

      {laps.length > 0 && (
        <div className="w-full max-w-md">
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('stopwatch.lap')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('stopwatch.lapTime')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('stopwatch.total')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {laps.map((lapItem, index) => (
                  <tr
                    key={lapItem.id}
                    className={cn(
                      'border-b border-border transition-colors last:border-0',
                      index === best && laps.length > 1 && 'text-green-600',
                      index === worst && laps.length > 1 && 'text-muted-foreground',
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {t('stopwatch.lapNumber', { count: laps.length - index })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums">
                      {formatTime(lapItem.lapTime)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                      {formatTime(lapItem.time)}
                    </td>
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
