import { useTranslation } from 'react-i18next';
import { useTimerContext } from '../../contexts/TimerContext';
import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw } from 'lucide-react';

export function TimerControls() {
  const { t } = useTranslation();
  const { timerState, pauseTimer, resumeTimer, resetTimer } = useTimerContext();

  if (timerState.status === 'idle') return null;

  return (
    <div className="flex justify-center gap-4">
      {timerState.status === 'running' ? (
        <Button onClick={pauseTimer} size="lg">
          <Pause className="h-4 w-4 mr-2" />
          {t('timer.pause')}
        </Button>
      ) : (
        <Button onClick={resumeTimer} size="lg">
          <Play className="h-4 w-4 mr-2" />
          {t('timer.resume')}
        </Button>
      )}
      <Button onClick={resetTimer} variant="outline" size="lg">
        <RotateCcw className="h-4 w-4 mr-2" />
        {t('timer.reset')}
      </Button>
    </div>
  );
}
