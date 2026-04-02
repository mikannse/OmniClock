import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useTimerContext } from '../../contexts/TimerContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { languages, changeLanguage } from '@/i18n';
import { Moon, Sun, Monitor } from 'lucide-react';
import { VERSION } from '@/utils/version';

export function SettingsView() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useTimerContext();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Notifications */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium">{t('settings.notifications')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-sm text-muted-foreground">
              {t('settings.notificationsEnabled')}
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
        <h3 className="text-sm font-medium">{t('settings.sound')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound" className="text-sm text-muted-foreground">
              {t('settings.soundEnabled')}
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

      {/* Theme */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium">{t('settings.theme')}</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => updateSettings({ theme: 'light' })}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
              settings.theme === 'light'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Sun className="h-5 w-5" />
            <span className="text-xs">{t('settings.light')}</span>
          </button>
          <button
            onClick={() => updateSettings({ theme: 'dark' })}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
              settings.theme === 'dark'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Moon className="h-5 w-5" />
            <span className="text-xs">{t('settings.dark')}</span>
          </button>
          <button
            onClick={() => updateSettings({ theme: 'system' })}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
              settings.theme === 'system'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Monitor className="h-5 w-5" />
            <span className="text-xs">{t('settings.system')}</span>
          </button>
        </div>
      </section>

      <Separator />

      {/* Language */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium">{t('settings.language')}</h3>
        <div className="space-y-2">
          <Label htmlFor="language" className="text-sm text-muted-foreground">
            {t('settings.selectLanguage')}
          </Label>
          <select
            id="language"
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-background border border-border rounded-lg"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
        </div>
      </section>

      <Separator />

      {/* About */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium">{t('settings.about')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('app.name')}</div>
            <div className="font-medium">Omni Clock</div>
          </div>
          <div className="p-4 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('settings.version')}</div>
            <div className="font-medium">v{VERSION}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
