# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Omni Clock** is a multi-module clock application built with Tauri 2.x + React + TypeScript. It provides timer (segmented), stopwatch, countdown, and settings modules with a clean, minimal UI using neutral gray tones and shadcn/ui-style components.

## Development Commands

```bash
# Install dependencies (first time only)
npm install

# Start development server (frontend + Tauri)
npm run tauri dev

# TypeScript check only
npx tsc --noEmit

# Build for production
npm run tauri build

# Frontend only (Vite)
npm run dev
npm run build

# Update release version (run before tagging)
npm run release:prepare -- 0.4.6
```

## Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, TailwindCSS 4.x (via @tailwindcss/postcss)
- **Backend**: Tauri 2.x (Rust)
- **State**: React Context + useReducer
- **Persistence**: Tauri fs plugin → JSON files in AppData/OmniClock
- **Notifications**: Tauri notification plugin
- **Audio**: Web Audio API
- **UI Components**: Custom shadcn/ui-style components (Button, Switch, Slider, Label, Separator)
- **Icons**: lucide-react

### State Management
- `TimerContext` (`src/contexts/TimerContext.tsx`) - Global state for timer configs, settings, and active timer state
- `PomodoroContext` (`src/contexts/PomodoroContext.tsx`) - Pomodoro timer state with work/break cycle management
- `ThemeContext` (`src/contexts/ThemeContext.tsx`) - Theme resolution (light/dark/system)
- All use `useReducer` with explicit action types for predictable state updates
- Refs used for interval tracking and callback stability in timers

### Layout Structure
- Sidebar navigation (left, ~224px) with logo, nav items, version footer
- Main content area with max-width container (512px)
- No decorative elements (no starfield, grid, scanlines, or neon glows)

### Module Structure
Each feature module is in `src/components/{Module}/`:
- `Timer/` - Custom timed exam configurations with segment support (TimerView, TimerDisplay, TimerControls, TimerConfigForm)
- `Pomodoro/` - Pomodoro technique timer with work/short break/long break cycles (PomodoroView)
- `Stopwatch/` - Standard stopwatch with lap recording (StopwatchView)
- `Countdown/` - Simple countdown with circular progress ring (CountdownView)
- `Settings/` - Notification, sound, and theme toggles (SettingsView)

### Data Models (src/types/index.ts)
```typescript
interface TimerConfig {
  id: string;
  name: string;
  totalMinutes: number;
  segments: TimerSegment[];
  createdAt: number;
}
interface TimerSegment {
  id: string;
  name: string;
  minutes: number;
}
interface Settings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
}
interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
}
interface TimerState {
  status: TimerStatus;
  currentSegmentIndex: number;
  remainingSeconds: number;
  totalElapsedSeconds: number;
}
interface PomodoroState {
  status: 'idle' | 'working' | 'shortBreak' | 'longBreak';
  completedPomodoros: number;
  remainingSeconds: number;
  totalElapsedSeconds: number;
}
type TimerStatus = 'idle' | 'running' | 'paused';
interface StopwatchLap {
  id: string;
  time: number;
  lapTime: number;
}
type ModuleType = 'timer' | 'pomodoro' | 'stopwatch' | 'countdown' | 'settings';
```

### Persistence (src/utils/storage.ts)
- Uses Tauri fs plugin with AppData directory
- Data stored in `data/` subdirectory within AppData/OmniClock
- `data/configs.json` - Array of TimerConfig
- `data/settings.json` - Settings object (includes theme preference)
- `data/pomodoro.json` - PomodoroSettings object
- Auto-creates `OmniClock/data/` directory on first load

### Internationalization (src/i18n/)
- 6 languages: English, Chinese (Simplified/Traditional), Japanese, French, German
- Language stored in localStorage under 'language' key
- `changeLanguage(code)` function exported for language switching
- Translation keys: app, nav, timer, pomodoro, stopwatch, countdown, settings, common

### Tauri Plugins Used
- `tauri-plugin-fs` - File system access for JSON persistence
- `tauri-plugin-notification` - Desktop notifications
- `tauri-plugin-opener` - Default opener (included in template)
- `tauri-plugin-updater` - Auto-update via GitHub releases
- `tauri-plugin-autostart` - Launch on system startup
- `tauri-plugin-dialog` - Native dialogs

### System Tray (src-tauri/src/lib.rs)
- Tray icon with context menu (Show/Hide/Start Work/Quit)
- Left-click shows and focuses window
- Right-click opens menu
- Emits `tray-start-work` event to frontend for starting Pomodoro
- Tauri feature `tray-icon` enabled in Cargo.toml
- **Desktop-only**: wrapped in `#[cfg(not(mobile))]` conditionals

### Custom Title Bar (src/components/CustomTitleBar.tsx)
- Uses `decorations: false` in tauri.conf.json for frameless window
- Window controls (minimize/maximize/close) implemented in React using Tauri window API
- `data-tauri-drag-region` attribute enables native window dragging
- `isMaximized` state tracks window state for correct icon display
- `shrink-0` prevents title bar from shrinking in flex layout

### Platform Differences
- **Desktop**: Custom title bar, system tray, window controls
- **Mobile (Android/iOS)**: Uses native system title bar (`decorations: true`), no tray
- Frontend detects platform via `window.__TAURI__` presence
- Rust backend uses `#[cfg(not(mobile))]` for desktop-only code

### Platform-Specific Implementation
- **Notifications**: macOS uses AppleScript (`osascript -e "display notification..."`) via `Command::new("osascript")` to avoid Tauri plugin hash issue. Windows/Linux use `tauri_plugin_notification::NotificationExt`. Frontend calls `invoke('send_notification', { title, body })`.
- **Autostart**: Uses `tauri_plugin_autostart::launcher::LaunchAgent` (cross-platform, not `MacosLauncher::LaunchAgent`)
- **System tray**: Only initialized on desktop (`#[cfg(not(mobile))]`)

### Tauri Capabilities (src-tauri/capabilities/default.json)
Capabilities enable permissions for Tauri APIs:
- `core:default`, `core:event:default`
- `core:window:default`, `core:window:allow-minimize`, `core:window:allow-maximize`, `core:window:allow-unmaximize`, `core:window:allow-is-maximized`, `core:window:allow-start-dragging`, `core:window:allow-close`, `core:window:allow-show`, `core:window:allow-hide`, `core:window:allow-set-focus`
- `fs:default`, `fs:allow-appdata-read-recursive`, `fs:allow-appdata-write-recursive`
- `notification:default`, `opener:default`

### UI Styling

**CSS Theme** (`src/index.css`):
- Uses TailwindCSS v4 with `@import "tailwindcss"` syntax
- CSS variables defined in `:root` (light mode) and `.dark` (dark mode)
- Variables exposed via `@theme inline` for Tailwind utility classes
- **Light mode**: white background (`oklch(1 0 0)`), dark text
- **Dark mode**: dark background (`oklch(0.145 0 0)`), light text

**Custom Utilities** (`src/index.css`):
- `.button-scale` - Hover scale effect (1.05) with spring animation, active scale (0.98)
- Custom scrollbar styling with `::-webkit-scrollbar` (8px width, border-aware colors)
- `html, body { height: 100% }` required for full-height layout

**Color System**:
```css
--background: oklch(1 0 0) / oklch(0.145 0 0)
--foreground: oklch(0.145 0 0) / oklch(0.985 0 0)
--primary: oklch(0.205 0 0) / oklch(0.985 0 0)
--secondary: oklch(0.97 0 0) / oklch(0.269 0 0)
--muted: oklch(0.97 0 0) / oklch(0.269 0 0)
--border: oklch(0.922 0 0) / oklch(0.269 0 0)
--destructive: oklch(0.577 0.245 27.325) / oklch(0.396 0.141 25.723)
```

**Component Library** (`src/components/ui/`):
- Button (variants: default, destructive, outline, secondary, ghost, link)
- Label, Switch, Slider, Separator
- All use `class-variance-authority` for variant handling
- `cn()` utility (`src/lib/utils.ts`) combines clsx + tailwind-merge for class merging

### Commit Message Format
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>: <description>

[optional body]
```
Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

### Rust Backend (src-tauri/src/lib.rs)
- System tray setup with context menu (Show/Hide/Start Work/Quit)
- Tray icon using `tray-icon` feature
- Emits `tray-start-work` event to frontend via Tauri events API
- Desktop-only: tray setup guarded by `#[cfg(not(mobile))]`

### Window Configuration
- Default size: 900x700px
- Minimum size: 700x500px
- App identifier: OmniClock (from tauri.conf.json)
- DevTools open automatically in debug builds
- Custom frameless window (`decorations: false`) with React-based title bar

### Provider Hierarchy
```
TimerProvider
  └── PomodoroProvider
        └── ThemeProvider
              └── TrayEventHandler
                    └── AppContent
```
