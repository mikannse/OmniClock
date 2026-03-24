import { useState } from 'react';
import { TimerProvider } from './contexts/TimerContext';
import { TimerView } from './components/Timer/TimerView';
import { StopwatchView } from './components/Stopwatch/StopwatchView';
import { CountdownView } from './components/Countdown/CountdownView';
import { SettingsView } from './components/Settings/SettingsView';
import { Clock, Timer, Hourglass, Settings } from 'lucide-react';
import './index.css';
import type { ModuleType } from './types';

const NAV_ITEMS: { id: ModuleType; label: string; icon: React.ReactNode }[] = [
  { id: 'timer', label: '计时器', icon: <Clock className="h-5 w-5" /> },
  { id: 'stopwatch', label: '秒表', icon: <Timer className="h-5 w-5" /> },
  { id: 'countdown', label: '倒计时', icon: <Hourglass className="h-5 w-5" /> },
  { id: 'settings', label: '设置', icon: <Settings className="h-5 w-5" /> },
];

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleType>('timer');

  const renderModule = () => {
    switch (activeModule) {
      case 'timer':
        return <TimerView />;
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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-border">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Clock className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base tracking-tight">AllClock</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeModule === item.id
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">v0.1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
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
      <AppContent />
    </TimerProvider>
  );
}

export default App;