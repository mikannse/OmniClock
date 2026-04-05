import { useEffect, useState } from 'react';
import { Coffee, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { usePomodoroContext } from '../../contexts/PomodoroContext';
import { formatTime } from '../../utils/time';

type ViewMode = 'timer' | 'settings';

export function PomodoroView() {
  const { t } = useTranslation();
  const {
    settings,
    pomodoroState,
    isRunning,
    updatePomodoroSettings,
    startWork,
    startShortBreak,
    startLongBreak,
    skip,
    reset,
  } = usePomodoroContext();

  const [viewMode, setViewMode] = useState<ViewMode>('timer');
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSaveSettings = async () => {
    await updatePomodoroSettings(localSettings);
    setViewMode('timer');
  };

  const handleCancelSettings = () => {
    setLocalSettings(settings);
    setViewMode('timer');
  };

  const getStatusLabel = () => {
    switch (pomodoroState.status) {
      case 'working':
        return t('pomodoro.working');
      case 'shortBreak':
        return t('pomodoro.shortBreak');
      case 'longBreak':
        return t('pomodoro.longBreak');
      default:
        return t('pomodoro.startWork');
    }
  };

  const getNextStatusLabel = () => {
    const completed = pomodoroState.completedPomodoros;
    const isLongBreakTime = (completed + 1) % settings.longBreakInterval === 0;

    if (pomodoroState.status === 'idle') return t('pomodoro.startWork');
    if (pomodoroState.status === 'working') {
      return isLongBreakTime ? t('pomodoro.longBreak') : t('pomodoro.shortBreak');
    }

    return t('pomodoro.working');
  };

  const getTotalSeconds = () => {
    switch (pomodoroState.status) {
      case 'working':
        return settings.workMinutes * 60;
      case 'shortBreak':
        return settings.shortBreakMinutes * 60;
      case 'longBreak':
        return settings.longBreakMinutes * 60;
      default:
        return settings.workMinutes * 60;
    }
  };

  const progress =
    pomodoroState.status !== 'idle'
      ? ((getTotalSeconds() - pomodoroState.remainingSeconds) / getTotalSeconds()) * 100
      : 0;

  const isWarning = pomodoroState.remainingSeconds <= 30 && pomodoroState.remainingSeconds > 0;

  if (viewMode === 'settings') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-px bg-border" />
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t('pomodoro.settings')}
          </span>
        </div>

        <div className="space-y-6 rounded-lg border border-border p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('pomodoro.workDuration')}</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.workMinutes} {t('timer.minutes')}
              </span>
            </div>
            <Slider
              value={[localSettings.workMinutes]}
              onValueChange={(value) => setLocalSettings({ ...localSettings, workMinutes: value[0] })}
              min={1}
              max={60}
              step={1}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('pomodoro.shortBreakDuration')}</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.shortBreakMinutes} {t('timer.minutes')}
              </span>
            </div>
            <Slider
              value={[localSettings.shortBreakMinutes]}
              onValueChange={(value) => setLocalSettings({ ...localSettings, shortBreakMinutes: value[0] })}
              min={1}
              max={30}
              step={1}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('pomodoro.longBreakDuration')}</Label>
              <span className="text-sm text-muted-foreground">
                {localSettings.longBreakMinutes} {t('timer.minutes')}
              </span>
            </div>
            <Slider
              value={[localSettings.longBreakMinutes]}
              onValueChange={(value) => setLocalSettings({ ...localSettings, longBreakMinutes: value[0] })}
              min={5}
              max={60}
              step={1}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('pomodoro.longBreakInterval')}</Label>
              <span className="text-sm text-muted-foreground">
                {t('pomodoro.pomodorosBeforeLong', { count: localSettings.longBreakInterval })}
              </span>
            </div>
            <Slider
              value={[localSettings.longBreakInterval]}
              onValueChange={(value) => setLocalSettings({ ...localSettings, longBreakInterval: value[0] })}
              min={2}
              max={10}
              step={1}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSaveSettings} className="flex-1">
            {t('pomodoro.save')}
          </Button>
          <Button onClick={handleCancelSettings} variant="outline" className="flex-1">
            {t('pomodoro.cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('pomodoro.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('pomodoro.completed', { count: pomodoroState.completedPomodoros })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setViewMode('settings')} disabled={isRunning}>
          <Timer className="mr-2 h-4 w-4" />
          {t('pomodoro.settings')}
        </Button>
      </div>

      <div className="rounded-lg border border-border p-6">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground">
            <Coffee className="h-4 w-4" />
            {getStatusLabel()}
          </div>
        </div>

        <div className="mb-6 py-8 text-center">
          <div
            className={cn(
              'font-mono text-7xl font-light tracking-tight tabular-nums',
              isWarning ? 'text-destructive' : 'text-foreground',
            )}
          >
            {formatTime(pomodoroState.remainingSeconds || settings.workMinutes * 60)}
          </div>
        </div>

        <div className="mb-6 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              pomodoroState.status === 'working'
                ? 'bg-primary'
                : pomodoroState.status === 'shortBreak'
                  ? 'bg-green-500'
                  : 'bg-blue-500',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t('stopwatch.total')}: {formatTime(pomodoroState.totalElapsedSeconds)}
          </span>
          <span>
            {t('pomodoro.workDuration')}: {getTotalSeconds() / 60} {t('timer.minutes')}
          </span>
        </div>
      </div>

      {isRunning && (
        <div className="text-center text-sm text-muted-foreground">
          <SkipForward className="mr-1 inline h-3 w-3" />
          {t('pomodoro.startNext')}: {getNextStatusLabel()}
        </div>
      )}

      <div className="flex gap-3">
        {!isRunning ? (
          <Button onClick={startWork} className="flex-1" size="lg">
            <Play className="mr-2 h-4 w-4" />
            {t('pomodoro.startWork')}
          </Button>
        ) : (
          <>
            <Button onClick={skip} variant="outline" size="lg" className="flex-1">
              <SkipForward className="mr-2 h-4 w-4" />
              {t('pomodoro.skip')}
            </Button>
            <Button onClick={startWork} variant="outline" size="lg">
              {t('pomodoro.working')}
            </Button>
            <Button onClick={startShortBreak} variant="outline" size="lg">
              {t('pomodoro.shortBreak')}
            </Button>
            <Button onClick={startLongBreak} variant="outline" size="lg">
              {t('pomodoro.longBreak')}
            </Button>
            <Button onClick={reset} variant="destructive" size="lg">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="mb-2 flex items-center gap-3">
          <div className="h-px w-6 bg-border" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t('pomodoro.tips.title')}
          </span>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>• {t('pomodoro.tips.work', { minutes: settings.workMinutes })}</li>
          <li>• {t('pomodoro.tips.shortBreak', { minutes: settings.shortBreakMinutes })}</li>
          <li>
            • {t('pomodoro.tips.longBreak', {
              count: settings.longBreakInterval,
              minutes: settings.longBreakMinutes,
            })}
          </li>
          <li>• {t('pomodoro.tips.autoSwitch')}</li>
        </ul>
      </div>
    </div>
  );
}
