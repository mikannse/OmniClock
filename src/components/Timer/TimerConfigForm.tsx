import { useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { TimerSegment } from '../../types';
import { useTimerContext } from '../../contexts/TimerContext';
import { generateId } from '../../utils/time';

interface TimerConfigFormProps {
  editConfig?: {
    id: string;
    name: string;
    segments: TimerSegment[];
  };
  onSave?: () => void;
  onCancel?: () => void;
}

export function TimerConfigForm({ editConfig, onSave, onCancel }: TimerConfigFormProps) {
  const { t } = useTranslation();
  const { addConfig, updateConfig } = useTimerContext();
  const [name, setName] = useState(editConfig?.name || '');
  const [segments, setSegments] = useState<TimerSegment[]>(
    editConfig?.segments || [{ id: generateId(), name: '', minutes: 0 }],
  );

  const handleAddSegment = () => {
    setSegments([...segments, { id: generateId(), name: '', minutes: 0 }]);
  };

  const handleRemoveSegment = (id: string) => {
    if (segments.length <= 1) return;
    setSegments(segments.filter((segment) => segment.id !== id));
  };

  const handleSegmentChange = (id: string, field: 'name' | 'minutes', value: string | number) => {
    setSegments(
      segments.map((segment) =>
        segment.id === id
          ? { ...segment, [field]: field === 'minutes' ? Number(value) : value }
          : segment,
      ),
    );
  };

  const validSegments = segments.filter((segment) => segment.name.trim() && segment.minutes > 0);
  const totalMinutes = validSegments.reduce((sum, segment) => sum + segment.minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || validSegments.length === 0) {
      return;
    }

    if (editConfig) {
      await updateConfig(editConfig.id, { name, segments: validSegments });
    } else {
      await addConfig({ name, segments: validSegments, totalMinutes });
    }

    onSave?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium">{t('timer.configName')}</label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('timer.configName')}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm"
          required
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="block text-sm font-medium">{t('timer.segments')}</label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddSegment}>
            <Plus className="mr-1 h-4 w-4" />
            {t('timer.addSegment')}
          </Button>
        </div>

        <div className="space-y-3">
          {segments.map((segment, index) => (
            <div key={segment.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <span className="w-6 text-sm font-medium text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <input
                type="text"
                value={segment.name}
                onChange={(event) => handleSegmentChange(segment.id, 'name', event.target.value)}
                placeholder={t('timer.segmentName')}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSegmentChange(segment.id, 'minutes', Math.max(1, segment.minutes - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary transition-colors hover:bg-secondary/80"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  value={segment.minutes || ''}
                  onChange={(event) =>
                    handleSegmentChange(segment.id, 'minutes', Math.max(1, Number(event.target.value)))
                  }
                  placeholder={t('timer.minutes')}
                  min="1"
                  className="w-14 rounded-md border border-input bg-background px-2 py-2 text-center text-sm [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleSegmentChange(segment.id, 'minutes', segment.minutes + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary transition-colors hover:bg-secondary/80"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">{t('common.minuteShortUpper')}</span>
              {segments.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveSegment(segment.id)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t('timer.totalTime')}:</span>
        <span className="font-mono">
          {totalHours > 0 ? `${totalHours}${t('common.hourShort')} ` : ''}
          {remainingMinutes}
          {t('common.minuteShort')}
        </span>
        <span className="text-xs">({t('timer.segmentCount', { count: validSegments.length })})</span>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1">
          {editConfig ? t('common.save') : t('timer.createConfig')}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
