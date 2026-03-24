import { useTimerContext } from '../../contexts/TimerContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export function SettingsView() {
  const { settings, updateSettings } = useTimerContext();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
        <p className="text-sm text-muted-foreground mt-1">自定义您的时钟应用体验</p>
      </div>

      {/* Notifications */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium">通知</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-sm text-muted-foreground">
              启用桌面通知
            </Label>
            <Switch
              id="notifications"
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) => updateSettings({ notificationsEnabled: checked })}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Sound */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium">声音</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound" className="text-sm text-muted-foreground">
              启用提示音
            </Label>
            <Switch
              id="sound"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* About */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium">关于</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">应用程序</div>
            <div className="font-medium">AllClock</div>
          </div>
          <div className="p-4 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">版本</div>
            <div className="font-medium">v0.1.0</div>
          </div>
        </div>
      </section>
    </div>
  );
}
