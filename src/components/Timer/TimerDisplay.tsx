import { useTimerContext } from '../../contexts/TimerContext';
import { formatTime } from '../../utils/time';
import { cn } from '@/lib/utils';

export function TimerDisplay() {
  const { timerState, activeConfig, warning, jumpToSegment } = useTimerContext();

  if (!activeConfig) return null;

  const currentSegment = activeConfig.segments[timerState.currentSegmentIndex];
  const progress = currentSegment
    ? ((currentSegment.minutes * 60 - timerState.remainingSeconds) / (currentSegment.minutes * 60)) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Main display */}
      <div className="rounded-lg border border-border p-6">
        {/* Config & segment info */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-3">{activeConfig.name}</h2>
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs px-3 py-1 rounded-lg bg-secondary text-secondary-foreground">
              {currentSegment?.name}
            </span>
            <span className="text-xs text-muted-foreground">
              阶段 {timerState.currentSegmentIndex + 1} / {activeConfig.segments.length}
            </span>
          </div>
        </div>

        {/* Big timer */}
        <div className="text-center mb-6 py-8">
          <div
            className={cn(
              "font-mono text-7xl font-light tracking-tight tabular-nums",
              warning ? "text-destructive" : "text-foreground"
            )}
          >
            {formatTime(timerState.remainingSeconds)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-full h-2 bg-muted overflow-hidden mb-4">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              warning ? "bg-destructive" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>总耗时</span>
            <span className="font-mono">{formatTime(timerState.totalElapsedSeconds)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>剩余</span>
            <span className="font-mono">{formatTime(timerState.remainingSeconds)}</span>
          </div>
        </div>
      </div>

      {/* Segment overview */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px w-6 bg-border" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">分段概览</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {activeConfig.segments.map((seg, idx) => {
            const isActive = idx === timerState.currentSegmentIndex;
            const isPast = idx < timerState.currentSegmentIndex;
            const isFuture = idx > timerState.currentSegmentIndex;

            return (
              <button
                key={seg.id}
                onClick={() => jumpToSegment(idx)}
                className={cn(
                  "relative p-3 rounded-lg border transition-colors text-left",
                  isActive ? "border-primary bg-secondary" : "border-border bg-card",
                  isFuture && timerState.status !== 'idle' && "opacity-60 hover:opacity-100 cursor-pointer"
                )}
                disabled={timerState.status === 'idle'}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium uppercase tracking-wider",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {idx + 1}
                  </span>
                  {isPast && (
                    <svg className="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className={cn("text-sm", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {seg.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {seg.minutes}m
                </div>
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 h-1 rounded-b transition-all duration-300 bg-primary"
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