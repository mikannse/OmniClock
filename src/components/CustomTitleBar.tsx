import { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimerContext } from '../contexts/TimerContext';

export function CustomTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();
  const { settings } = useTimerContext();

  const handleMinimize = () => appWindow.minimize();

  const handleMaximize = async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
    } else {
      await appWindow.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = () => {
    if (settings.closeToTray) {
      appWindow.hide();
    } else {
      appWindow.close();
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-9 bg-background border-b border-border flex items-center justify-between select-none shrink-0"
    >
      {/* App title */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-3 flex-1 h-full"
      >
        <span className="text-sm font-medium text-foreground/80">Omni Clock</span>
      </div>

      {/* Window controls */}
      <div className="flex items-center h-full">
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className={cn(
            'h-full px-4 flex items-center justify-center',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            'transition-colors duration-150 button-scale'
          )}
          aria-label="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className={cn(
            'h-full px-4 flex items-center justify-center',
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            'transition-colors duration-150 button-scale'
          )}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Copy className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className={cn(
            'h-full px-4 flex items-center justify-center',
            'text-muted-foreground hover:bg-destructive hover:text-destructive-foreground',
            'transition-colors duration-150 button-scale'
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}