import { useState } from 'react';
import { ask } from '@tauri-apps/plugin-dialog';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TimerConfigForm } from './TimerConfigForm';
import { TimerControls } from './TimerControls';
import { TimerDisplay } from './TimerDisplay';
import { useTimerContext } from '../../contexts/TimerContext';
import { minutesToSeconds } from '../../utils/time';

type ViewMode = 'list' | 'create' | 'edit';

export function TimerView() {
  const { t } = useTranslation();
  const { configs, timerState, startTimer, deleteConfig } = useTimerContext();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingConfig, setEditingConfig] = useState<typeof configs[0] | null>(null);

  const handleEditConfig = (config: typeof configs[0]) => {
    setEditingConfig(config);
    setViewMode('edit');
  };

  const handleDeleteConfig = async (configId: string, configName: string) => {
    const confirmed = await ask(t('timer.deleteConfirm', { name: configName }), {
      title: t('common.confirm'),
      kind: 'warning',
    });

    if (confirmed) {
      await deleteConfig(configId);
    }
  };

  const handleSaveForm = () => {
    setViewMode('list');
    setEditingConfig(null);
  };

  if (timerState.status !== 'idle') {
    return (
      <div className="space-y-6">
        <TimerDisplay />
        <TimerControls />
      </div>
    );
  }

  if (viewMode === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-px bg-border" />
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t('timer.createConfig')}
          </span>
        </div>
        <TimerConfigForm onSave={handleSaveForm} onCancel={() => setViewMode('list')} />
      </div>
    );
  }

  if (viewMode === 'edit' && editingConfig) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-px bg-border" />
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {t('common.edit')} {t('timer.title')}
          </span>
        </div>
        <TimerConfigForm
          editConfig={editingConfig}
          onSave={handleSaveForm}
          onCancel={() => setViewMode('list')}
        />
      </div>
    );
  }

  const totalSegments = configs.reduce((sum, config) => sum + config.segments.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('timer.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('timer.configCount', { count: configs.length })} / {t('timer.segmentCount', { count: totalSegments })}
          </p>
        </div>
        <Button onClick={() => setViewMode('create')} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t('timer.createConfig')}
        </Button>
      </div>

      {configs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="mb-4 text-muted-foreground">{t('timer.noConfigs')}</p>
          <Button onClick={() => setViewMode('create')} variant="outline">
            {t('timer.createConfig')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => {
            const totalSeconds = config.segments.reduce((sum, segment) => sum + minutesToSeconds(segment.minutes), 0);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);

            return (
              <div key={config.id} className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="truncate font-medium">{config.name}</h3>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {t('timer.segmentCount', { count: config.segments.length })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {hours > 0 ? `${hours}${t('common.hourShort')} ` : ''}
                      {minutes}
                      {t('common.minuteShort')} · {config.segments.map((segment) => segment.name).join(' -> ')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {config.segments.map((segment, index) => (
                        <span
                          key={segment.id}
                          className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                        >
                          {index + 1}. {segment.name} ({segment.minutes}
                          {t('common.minuteShort')})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => startTimer(config.id)}>
                      {t('timer.start')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditConfig(config)}>
                      {t('common.edit')}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteConfig(config.id, config.name)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
