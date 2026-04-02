import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTimerContext } from '../../contexts/TimerContext';
import type { TimerSegment } from '../../types';
import { generateId } from '../../utils/time';
import { Button } from '@/components/ui/button';
import { Plus, X, Minus } from 'lucide-react';

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
    editConfig?.segments || [{ id: generateId(), name: '', minutes: 0 }]
  );

  const handleAddSegment = () => {
    setSegments([...segments, { id: generateId(), name: '', minutes: 0 }]);
  };

  const handleRemoveSegment = (id: string) => {
    if (segments.length <= 1) return;
    setSegments(segments.filter((s) => s.id !== id));
  };

  const handleSegmentChange = (id: string, field: 'name' | 'minutes', value: string | number) => {
    setSegments(
      segments.map((s) => (s.id === id ? { ...s, [field]: field === 'minutes' ? Number(value) : value } : s))
    );
  };

  const validSegments = segments.filter((s) => s.name.trim() && s.minutes > 0);
  const totalMinutes = validSegments.reduce((sum, s) => sum + s.minutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || segments.length === 0) return;

    if (validSegments.length === 0) return;

    if (editConfig) {
      await updateConfig(editConfig.id, { name, segments: validSegments });
    } else {
      await addConfig({ name, segments: validSegments, totalMinutes });
    }
    onSave?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Config name */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {t('timer.configName')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('timer.configName')}
          className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm"
          required
        />
      </div>

      {/* Segments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium">
            {t('timer.segments')}
          </label>
          <Button type="button" variant="outline" size="sm" onClick={handleAddSegment}>
            <Plus className="h-4 w-4 mr-1" />
            {t('timer.addSegment')}
          </Button>
        </div>

        <div className="space-y-3">
          {segments.map((segment, index) => (
            <div
              key={segment.id}
              className="flex gap-3 items-center p-3 rounded-lg border border-border bg-card"
            >
              <span className="text-sm font-medium text-muted-foreground w-6">
                {String(index + 1).padStart(2, '0')}
              </span>
              <input
                type="text"
                value={segment.name}
                onChange={(e) => handleSegmentChange(segment.id, 'name', e.target.value)}
                placeholder={t('timer.segmentName')}
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                required
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSegmentChange(segment.id, 'minutes', Math.max(1, segment.minutes - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  value={segment.minutes || ''}
                  onChange={(e) => handleSegmentChange(segment.id, 'minutes', Math.max(1, Number(e.target.value)))}
                  placeholder={t('timer.minutes')}
                  min="1"
                  className="w-14 px-2 py-2 rounded-md border border-input bg-background text-sm text-center [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleSegmentChange(segment.id, 'minutes', segment.minutes + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">MIN</span>
              {segments.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSegment(segment.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Total time display */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t('timer.totalTime')}:</span>
        <span className="font-mono">
          {totalHours > 0 ? `${totalHours}h ` : ''}{remainingMinutes}m
        </span>
        <span className="text-xs">({validSegments.length} {t('timer.segments')})</span>
      </div>

      {/* Actions */}
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
