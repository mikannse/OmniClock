import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useTimerContext } from '../../contexts/TimerContext';
import { formatTime } from '../../utils/time';

export function TimerDisplay() {
  const { t } = useTranslation();
  const { timerState, activeConfig, warning, jumpToSegment } = useTimerContext();

  if (!activeConfig) {
    return null;
  }

  const currentSegment = activeConfig.segments[timerState.currentSegmentIndex];
  const segmentSeconds = (currentSegment?.minutes ?? 0) * 60;
  const progress = segmentSeconds > 0
    ? ((segmentSeconds - timerState.remainingSeconds) / segmentSeconds) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-6">
        <div className="mb-6 text-center">
          <h2 className="mb-3 text-xl font-semibold">{activeConfig.name}</h2>
          <div className="flex items-center justify-center gap-3">
            <span className="rounded-lg bg-secondary px-3 py-1 text-xs text-secondary-foreground">
              {currentSegment?.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('timer.segments')} {timerState.currentSegmentIndex + 1} / {activeConfig.segments.length}
            </span>
          </div>
        </div>

        <div className="mb-6 py-8 text-center">
          <div
            className={cn(
              'font-mono text-7xl font-light tracking-tight tabular-nums',
              warning ? 'text-destructive' : 'text-foreground',
            )}
          >
            {formatTime(timerState.remainingSeconds)}
          </div>
        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-300', warning ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{t('stopwatch.total')}</span>
            <span className="font-mono">{formatTime(timerState.totalElapsedSeconds)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{t('timer.remaining')}</span>
            <span className="font-mono">{formatTime(timerState.remainingSeconds)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-px w-6 bg-border" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t('timer.segments')} {t('timer.overview')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {activeConfig.segments.map((segment, index) => {
            const isActive = index === timerState.currentSegmentIndex;
            const isPast = index < timerState.currentSegmentIndex;
            const isFuture = index > timerState.currentSegmentIndex;

            return (
              <button
                key={segment.id}
                onClick={() => jumpToSegment(index)}
                className={cn(
                  'relative rounded-lg border bg-card p-3 text-left transition-colors',
                  isActive ? 'border-primary bg-secondary' : 'border-border',
                  isFuture && timerState.status !== 'idle' && 'cursor-pointer opacity-60 hover:opacity-100',
                )}
                disabled={timerState.status === 'idle'}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-medium uppercase tracking-wider',
                      isActive ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {index + 1}
                  </span>
                  {isPast && (
                    <svg
                      className="h-3 w-3 text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className={cn('text-sm', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {segment.name}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {segment.minutes}
                  {t('common.minuteShort')}
                </div>
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 h-1 rounded-b bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
