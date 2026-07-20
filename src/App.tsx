import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Clock, Coffee, Hourglass, LayoutDashboard, Settings, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CountdownView } from './components/Countdown/CountdownView';
import { DashboardView } from './components/Dashboard/DashboardView';
import { ErrorBoundary } from './components/ErrorBoundary';
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
  { id: 'dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { id: 'timer', icon: <Clock className="h-5 w-5" /> },
  { id: 'pomodoro', icon: <Coffee className="h-5 w-5" /> },
  { id: 'stopwatch', icon: <Timer className="h-5 w-5" /> },
  { id: 'countdown', icon: <Hourglass className="h-5 w-5" /> },
  { id: 'settings', icon: <Settings className="h-5 w-5" /> },
];

function TrayEventHandler() {
  const { startWork } = usePomodoroContext();
  const unlistenRef = useRef<(() => void) | null>(null);
  const startWorkRef = useRef(startWork);
  startWorkRef.current = startWork;

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const unlisten = await listen('tray-start-work', () => {
        startWorkRef.current();
      });
      if (mounted) {
        unlistenRef.current = unlisten;
      } else {
        unlisten();
      }
    };

    void setup();

    return () => {
      mounted = false;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, []);

  return null;
}

function AppContent() {
  const { t, i18n } = useTranslation();
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const moduleView = useMemo(() => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
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
  }, [activeModule]);

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

      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-8">{moduleView}</div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TimerProvider>
        <PomodoroProvider>
          <StopwatchProvider>
            <CountdownProvider>
              <div className="flex h-screen flex-col overflow-hidden">
                <ErrorBoundary>
                  <TrayEventHandler />
                  <AppContent />
                </ErrorBoundary>
              </div>
            </CountdownProvider>
          </StopwatchProvider>
        </PomodoroProvider>
      </TimerProvider>
    </ThemeProvider>
  );
}

export default App;
