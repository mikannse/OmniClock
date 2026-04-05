import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Copy, Minus, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useTimerContext } from '../contexts/TimerContext';

export function CustomTitleBar() {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();
  const { settings } = useTimerContext();

  useEffect(() => {
    void appWindow.isMaximized().then(setIsMaximized).catch(console.error);
  }, [appWindow]);

  const handleMinimize = () => appWindow.minimize();

  const handleMaximize = async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
      return;
    }

    await appWindow.maximize();
    setIsMaximized(true);
  };

  const handleClose = () => {
    if (settings.closeToTray) {
      void appWindow.hide();
      return;
    }
    void appWindow.close();
  };

  return (
    <div
      data-tauri-drag-region
      className="flex h-9 shrink-0 select-none items-center justify-between border-b border-border bg-background"
    >
      <div data-tauri-drag-region className="flex h-full flex-1 items-center gap-2 px-3">
        <span className="text-sm font-medium text-foreground/80">{t('app.name')}</span>
      </div>

      <div className="flex h-full items-center">
        <button
          onClick={handleMinimize}
          className={cn(
            'button-scale flex h-full items-center justify-center px-4',
            'text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground',
          )}
          aria-label={t('window.minimize')}
        >
          <Minus className="h-4 w-4" />
        </button>

        <button
          onClick={handleMaximize}
          className={cn(
            'button-scale flex h-full items-center justify-center px-4',
            'text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-accent-foreground',
          )}
          aria-label={isMaximized ? t('window.restore') : t('window.maximize')}
        >
          {isMaximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </button>

        <button
          onClick={handleClose}
          className={cn(
            'button-scale flex h-full items-center justify-center px-4',
            'text-muted-foreground transition-colors duration-150 hover:bg-destructive hover:text-destructive-foreground',
          )}
          aria-label={t('window.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
