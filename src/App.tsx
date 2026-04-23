import { useEffect, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Clock, Coffee, Hourglass, Settings, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CountdownView } from './components/Countdown/CountdownView';
import { CustomTitleBar } from './components/CustomTitleBar';
import { PomodoroView } from './components/Pomodoro/PomodoroView';
import { SettingsView } from './components/Settings/SettingsView';
import { StopwatchView } from './components/Stopwatch/StopwatchView';
import { TimerView } from './components/Timer/TimerView';
import { CountdownProvider } from './contexts/CountdownContext';
import { PomodoroProvider, usePomodoroContext } from './contexts/PomodoroContext';
import { StopwatchProvider } from './contexts/StopwatchContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TimerProvider } from './contexts/TimerContext';
import type { ModuleType } from './types';
import { cn } from './lib/utils';
import { VERSION } from './utils/version';
import './index.css';

const NAV_ITEMS: { id: ModuleType; icon: ReactNode }[] = [
  { id: 'timer', icon: <Clock className="h-5 w-5" /> },
  { id: 'pomodoro', icon: <Coffee className="h-5 w-5" /> },
  { id: 'stopwatch', icon: <Timer className="h-5 w-5" /> },
  { id: 'countdown', icon: <Hourglass className="h-5 w-5" /> },
  { id: 'settings', icon: <Settings className="h-5 w-5" /> },
];

function TrayEventHandler() {
  const { startWork } = usePomodoroContext();

  useEffect(() => {
    let stopped = false;

    const setupListener = async () => {
      const unlisten = await listen('tray-start-work', () => {
        if (!stopped) {
          startWork();
        }
      });

      if (stopped) {
        unlisten();
        return;
      }

      return unlisten;
    };

    let unlistenPromise = setupListener();

    return () => {
      stopped = true;
      unlistenPromise.then((unlisten) => {
        if (unlisten) unlisten();
      });
    };
  }, [startWork]);

  return null;
}

function AppContent() {
  const { t, i18n } = useTranslation();
  const [activeModule, setActiveModule] = useState<ModuleType>('timer');

  useEffect(() => {
    void invoke('update_tray_labels', {
      labels: {
        show: t('tray.show'),
        hide: t('tray.hide'),
        startWork: t('tray.startWork'),
        quit: t('tray.quit'),
        tooltip: t('tray.tooltip'),
      },
    }).catch(console.error);
  }, [i18n.language, t]);

  const renderModule = () => {
    switch (activeModule) {
      case 'timer':
        return <TimerView />;
      case 'pomodoro':
        return <PomodoroView />;
      case 'stopwatch':
        return <StopwatchView />;
      case 'countdown':
        return <CountdownView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TimerView />;
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Clock className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight">{t('app.name')}</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={cn(
                'button-scale flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                activeModule === item.id
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {item.icon}
              {t(`nav.${item.id}`)}
            </button>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-4">
          <p className="text-center text-xs text-muted-foreground">
            {t('app.version')} v{VERSION}
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">{renderModule()}</div>
      </main>
    </div>
  );
}

function App() {
  return (
    <TimerProvider>
      <PomodoroProvider>
        <ThemeProvider>
          <StopwatchProvider>
            <CountdownProvider>
              <div className="flex h-screen flex-col overflow-hidden">
                <CustomTitleBar />
                <TrayEventHandler />
                <AppContent />
              </div>
            </CountdownProvider>
          </StopwatchProvider>
        </ThemeProvider>
      </PomodoroProvider>
    </TimerProvider>
  );
}

export default App;
