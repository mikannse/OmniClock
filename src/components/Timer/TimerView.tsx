import { useState } from 'react';
import { useTimerContext } from '../../contexts/TimerContext';
import { TimerConfigForm } from './TimerConfigForm';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { minutesToSeconds } from '../../utils/time';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit';

export function TimerView() {
  const { configs, timerState, startTimer, deleteConfig } = useTimerContext();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingConfig, setEditingConfig] = useState<typeof configs[0] | null>(null);

  const handleStartConfig = (configId: string) => startTimer(configId);
  const handleEditConfig = (config: typeof configs[0]) => {
    setEditingConfig(config);
    setViewMode('edit');
  };
  const handleDeleteConfig = async (configId: string) => {
    if (confirm('确定要删除这个配置吗？')) {
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
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">创建计时配置</span>
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
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">编辑计时配置</span>
        </div>
        <TimerConfigForm
          editConfig={editingConfig}
          onSave={handleSaveForm}
          onCancel={() => setViewMode('list')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">计时配置</h1>
          <p className="text-sm text-muted-foreground">
            {configs.length} 个配置 / 共 {configs.reduce((sum, c) => sum + c.segments.length, 0)} 个分段
          </p>
        </div>
        <Button onClick={() => setViewMode('create')} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          新建配置
        </Button>
      </div>

      {/* Config list */}
      {configs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">暂无计时配置</p>
          <Button onClick={() => setViewMode('create')} variant="outline">
            创建第一个配置
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => {
            const totalSeconds = config.segments.reduce((sum, s) => sum + minutesToSeconds(s.minutes), 0);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);

            return (
              <div
                key={config.id}
                className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium truncate">{config.name}</h3>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {config.segments.length} 分段
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {hours > 0 ? `${hours}h ` : ''}{minutes}m · {config.segments.map(s => s.name).join(' → ')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {config.segments.map((seg, idx) => (
                        <span
                          key={seg.id}
                          className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                        >
                          {idx + 1}. {seg.name} ({seg.minutes}m)
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleStartConfig(config.id)}>
                      启动
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditConfig(config)}>
                      编辑
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteConfig(config.id)}>
                      删除
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