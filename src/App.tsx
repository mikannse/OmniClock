import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TimerProvider } from './contexts/TimerContext';
import { PomodoroProvider } from './contexts/PomodoroContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { StopwatchProvider } from './contexts/StopwatchContext';
import { CountdownProvider } from './contexts/CountdownContext';
import { TimerView } from './components/Timer/TimerView';
import { PomodoroView } from './components/Pomodoro/PomodoroView';
import { StopwatchView } from './components/Stopwatch/StopwatchView';
import { CountdownView } from './components/Countdown/CountdownView';
import { SettingsView } from './components/Settings/SettingsView';
import { CustomTitleBar } from './components/CustomTitleBar';
import { Clock, Timer, Hourglass, Settings, Coffee } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { usePomodoroContext } from './contexts/PomodoroContext';
import { VERSION } from './utils/version';
import './index.css';
import type { ModuleType } from './types';

const NAV_ITEMS: { id: ModuleType; icon: React.ReactNode }[] = [
  { id: 'timer', icon: <Clock className="h-5 w-5" /> },
  { id: 'pomodoro', icon: <Coffee className="h-5 w-5" /> },
  { id: 'stopwatch', icon: <Timer className="h-5 w-5" /> },
  { id: 'countdown', icon: <Hourglass className="h-5 w-5" /> },
  { id: 'settings', icon: <Settings className="h-5 w-5" /> },
];

function TrayEventHandler() {
  const { startWork } = usePomodoroContext();

  useEffect(() => {
    const unlisten = listen('tray-start-work', () => {
      startWork();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [startWork]);

  return null;
}

function AppContent() {
  const { t } = useTranslation();
  const [activeModule, setActiveModule] = useState<ModuleType>('timer');

  const getLabel = (id: ModuleType) => {
    return t(`nav.${id}`);
  };

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
    <div className="flex flex-1 bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-border shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base tracking-tight">{t('app.name')}</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors button-scale ${
                activeModule === item.id
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {item.icon}
              {getLabel(item.id)}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground text-center">{t('app.version')} v{VERSION}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {renderModule()}
        </div>
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
              <div className="flex flex-col h-screen overflow-hidden">
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
