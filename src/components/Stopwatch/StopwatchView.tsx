import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Flag } from 'lucide-react';
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
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const getBestWorst = () => {
    if (laps.length < 2) return { best: -1, worst: -1 };
    const withIndex = laps.map((lap, i) => ({ i, lapTime: lap.lapTime }));
    const sorted = [...withIndex].sort((a, b) => a.lapTime - b.lapTime);
    return { best: sorted[0].i, worst: sorted[sorted.length - 1].i };
  };

  const getStatusText = () => {
    if (isRunning) return 'Running';
    if (elapsedMs > 0) return 'Paused';
    return 'Ready';
  };

  const { best, worst } = getBestWorst();

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Display */}
      <div className="text-center">
        <div className="font-mono text-5xl md:text-7xl font-light tracking-tight text-foreground tabular-nums">
          {formatTime(elapsedMs)}
        </div>
        <div className="mt-2 text-xs text-muted-foreground uppercase tracking-widest">
          {getStatusText()}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 rounded-full"
          onClick={elapsedMs > 0 && !isRunning ? reset : lap}
          disabled={elapsedMs === 0}
        >
          {elapsedMs > 0 && !isRunning ? (
            <RotateCcw className="h-5 w-5" />
          ) : (
            <Flag className="h-5 w-5" />
          )}
          <span className="sr-only">{elapsedMs > 0 && !isRunning ? t('stopwatch.reset') : t('stopwatch.lap')}</span>
        </Button>

        <Button
          size="lg"
          className={cn(
            "h-20 w-20 rounded-full transition-all duration-300",
            isRunning ? "bg-accent hover:bg-accent/90" : "bg-primary hover:bg-primary/90"
          )}
          onClick={isRunning ? pause : start}
        >
          {isRunning ? (
            <Pause className="h-8 w-8" />
          ) : (
            <Play className="h-8 w-8 ml-1" />
          )}
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

      {/* Laps */}
      {laps.length > 0 && (
        <div className="w-full max-w-md">
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('stopwatch.lap')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('stopwatch.lap')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('stopwatch.total')}</th>
                </tr>
              </thead>
              <tbody>
                {laps.map((lapItem, index) => (
                  <tr
                    key={lapItem.id}
                    className={cn(
                      "border-b border-border last:border-0 transition-colors",
                      index === best && laps.length > 1 && "text-green-600",
                      index === worst && laps.length > 1 && "text-muted-foreground"
                    )}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{t('stopwatch.lapNumber', { count: laps.length - index })}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right tabular-nums">{formatTime(lapItem.lapTime)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right tabular-nums text-muted-foreground">{formatTime(lapItem.time)}</td>
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