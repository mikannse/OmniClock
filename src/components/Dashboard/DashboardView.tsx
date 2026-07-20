import { Clock, Coffee, Hourglass, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTimerContext } from '../../contexts/TimerContext';
import { usePomodoroContext } from '../../contexts/PomodoroContext';
import { useCountdownContext } from '../../contexts/CountdownContext';
import { useStopwatchContext } from '../../contexts/StopwatchContext';
import { formatTime } from '../../utils/time';

export function DashboardView() {
  const { t } = useTranslation();
  const { timerState, activeConfig, history } = useTimerContext();
  const { pomodoroState, isRunning: pomodoroRunning } = usePomodoroContext();
  const { state: countdownState } = useCountdownContext();
  const { state: stopwatchState } = useStopwatchContext();

  const hasActiveTimer = timerState.status !== 'idle';
  const hasActiveCountdown = countdownState.isRunning || (countdownState.timeLeft > 0 && countdownState.timeLeft < countdownState.totalSeconds);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {(hasActiveTimer || pomodoroRunning || hasActiveCountdown || stopwatchState.isRunning) ? (
        <div className="grid gap-4">
          {hasActiveTimer && activeConfig && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{activeConfig.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.segmentProgress', {
                      current: timerState.currentSegmentIndex + 1,
                      total: activeConfig.segments.length,
                    })} · {formatTime(timerState.remainingSeconds)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {pomodoroRunning && (
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <Coffee className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{t(`pomodoro.${pomodoroState.status}`)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(pomodoroState.remainingSeconds)} · {t('pomodoro.completed', { count: pomodoroState.completedPomodoros })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasActiveCountdown && (
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <Hourglass className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{t('countdown.title')}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(countdownState.timeLeft)}</p>
                </div>
              </div>
            </div>
          )}

          {stopwatchState.isRunning && (
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{t('stopwatch.title')}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(Math.floor(stopwatchState.elapsedMs / 1000))}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground">{t('dashboard.noActiveTimers')}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t('dashboard.recentHistory')}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.noHistory')}</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 3).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{entry.configName}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(entry.totalElapsedSeconds)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t('dashboard.pomodoroToday')}
          </div>
          <div className="text-2xl font-semibold">{pomodoroState.completedPomodoros}</div>
          <p className="text-sm text-muted-foreground">{t('pomodoro.completed', { count: pomodoroState.completedPomodoros })}</p>
        </div>
      </div>
    </div>
  );
}
