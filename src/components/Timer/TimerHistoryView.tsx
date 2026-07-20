import { useTranslation } from 'react-i18next';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TimerHistoryEntry } from '../../types';
import { useTimerContext } from '../../contexts/TimerContext';
import { formatTime } from '../../utils/time';

interface TimerHistoryViewProps {
  onBack: () => void;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function HistoryItem({ entry, onDelete }: { entry: TimerHistoryEntry; onDelete: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{entry.configName}</h3>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDateTime(entry.completedAt)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('timer.totalTime')}: {formatTime(entry.totalElapsedSeconds)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {entry.segments.map((segment, index) => (
              <span
                key={`${entry.id}-segment-${index}`}
                className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {index + 1}. {segment.name} ({formatTime(segment.actualSeconds)})
              </span>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete} className="shrink-0 text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TimerHistoryView({ onBack }: TimerHistoryViewProps) {
  const { t } = useTranslation();
  const { history, deleteHistoryEntry } = useTimerContext();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('timer.historyTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('timer.historySubtitle')}</p>
      </div>

      {history.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">{t('timer.noHistory')}</div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              onDelete={() => void deleteHistoryEntry(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
