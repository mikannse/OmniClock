import { Monitor, Moon, RefreshCw, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n, { changeLanguage, languages } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useUpdateCheck } from '@/hooks/useUpdateCheck';
import { cn } from '@/lib/utils';
import { VERSION } from '@/utils/version';
import { useTimerContext } from '../../contexts/TimerContext';

export function SettingsView() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useTimerContext();
  const { checking, checkForUpdates } = useUpdateCheck();
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

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

      <section className="space-y-4">
        <h3 className="text-sm font-medium">{t('settings.systemSection')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="autostart" className="text-sm text-muted-foreground">
              {t('settings.autostartEnabled')}
            </Label>
            <Switch
              id="autostart"
              checked={settings.autostartEnabled}
              onCheckedChange={(checked) => updateSettings({ autostartEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="closeToTray" className="text-sm text-muted-foreground">
              {t('settings.closeToTray')}
            </Label>
            <Switch
              id="closeToTray"
              checked={settings.closeToTray}
              onCheckedChange={(checked) => updateSettings({ closeToTray: checked })}
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-sm font-medium">{t('settings.theme')}</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => updateSettings({ theme: 'light' })}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
              settings.theme === 'light'
                ? 'border-primary bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Sun className="h-5 w-5" />
            <span className="text-xs">{t('settings.light')}</span>
          </button>
          <button
            onClick={() => updateSettings({ theme: 'dark' })}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
              settings.theme === 'dark'
                ? 'border-primary bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Moon className="h-5 w-5" />
            <span className="text-xs">{t('settings.dark')}</span>
          </button>
          <button
            onClick={() => updateSettings({ theme: 'system' })}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
              settings.theme === 'system'
                ? 'border-primary bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Monitor className="h-5 w-5" />
            <span className="text-xs">{t('settings.system')}</span>
          </button>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-sm font-medium">{t('settings.language')}</h3>
        <div className="space-y-2">
          <Label htmlFor="language" className="text-sm text-muted-foreground">
            {t('settings.selectLanguage')}
          </Label>
          <select
            id="language"
            value={currentLanguage}
            onChange={(event) => changeLanguage(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.nativeName} ({language.name})
              </option>
            ))}
          </select>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h3 className="text-sm font-medium">{t('settings.about')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{t('app.name')}</div>
            <div className="font-medium">{t('app.name')}</div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{t('settings.version')}</div>
            <div className="flex items-center justify-between font-medium">
              <span>v{VERSION}</span>
              <Button variant="ghost" size="sm" onClick={checkForUpdates} disabled={checking} className="h-7 px-2">
                <RefreshCw className={cn('mr-1 h-3 w-3', checking && 'animate-spin')} />
                {checking ? t('settings.checking') : t('settings.checkUpdate')}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
