# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AllClock** is a multi-module clock application built with Tauri 2.x + React + TypeScript. It provides timer (segmented), stopwatch, countdown, and settings modules with a clean, minimal UI using neutral gray tones and shadcn/ui-style components.

## Development Commands

```bash
# Start development server (frontend + Tauri)
npm run tauri dev

# TypeScript check only
npx tsc --noEmit

# Build for production
npm run tauri build

# Frontend only (Vite)
npm run dev
npm run build
```

## Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, TailwindCSS 4.x (via @tailwindcss/postcss)
- **Backend**: Tauri 2.x (Rust)
- **State**: React Context + useReducer
- **Persistence**: Tauri fs plugin → JSON files in AppData/AllClock
- **Notifications**: Tauri notification plugin
- **Audio**: Web Audio API
- **UI Components**: Custom shadcn/ui-style components (Button, Switch, Slider, Label, Separator)
- **Icons**: lucide-react

### State Management
- `TimerContext` (`src/contexts/TimerContext.tsx`) - Global state for timer configs, settings, and active timer state
- Uses `useReducer` with actions: SET_CONFIGS, SET_SETTINGS, START_TIMER, TICK, NEXT_SEGMENT, PAUSE, RESUME, RESET, TIMER_END, SET_WARNING
- Local component state for view-specific UI state

### Layout Structure
- Sidebar navigation (left, ~224px) with logo, nav items, version footer
- Main content area with max-width container (512px)
- No decorative elements (no starfield, grid, scanlines, or neon glows)

### Module Structure
Each feature module is in `src/components/{Module}/`:
- `Timer/` - Custom timed exam configurations with segment support (TimerView, TimerDisplay, TimerControls, TimerConfigForm)
- `Stopwatch/` - Standard stopwatch with lap recording (StopwatchView)
- `Countdown/` - Simple countdown with circular progress ring (CountdownView)
- `Settings/` - Notification and sound toggles (SettingsView)

### Data Models (src/types/index.ts)
```typescript
TimerConfig { id, name, totalMinutes, segments[], createdAt }
TimerSegment { id, name, minutes }
Settings { notificationsEnabled, soundEnabled }
TimerState { status, currentSegmentIndex, remainingSeconds, totalElapsedSeconds }
TimerStatus = 'idle' | 'running' | 'paused'
StopwatchLap { id, time, lapTime }
ModuleType = 'timer' | 'stopwatch' | 'countdown' | 'settings'
```

### Persistence (src/utils/storage.ts)
- Uses Tauri fs plugin with AppData directory
- `configs.json` - Array of TimerConfig
- `settings.json` - Settings object
- Auto-creates `AllClock/` directory on first load

### Tauri Plugins Used
- `tauri-plugin-fs` - File system access for JSON persistence
- `tauri-plugin-notification` - Desktop notifications
- `tauri-plugin-opener` - Default opener (included in template)

### Tauri Capabilities (src-tauri/capabilities/default.json)
- `fs:default`, `fs:allow-appdata-read-recursive`, `fs:allow-appdata-write-recursive`
- `notification:default`, `opener:default`, `core:default`

### UI Styling

**CSS Theme** (`src/index.css`):
- Uses TailwindCSS v4 with `@import "tailwindcss"` syntax
- CSS variables defined in `:root` (light mode) and `.dark` (dark mode)
- Variables exposed via `@theme inline` for Tailwind utility classes
- **Light mode**: white background (`oklch(1 0 0)`), dark text
- **Dark mode**: dark background (`oklch(0.145 0 0)`), light text

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
- `cn()` utility (`src/lib/utils.ts`) combines clsx + tailwind-merge

### Window Configuration
- Default size: 900x700px
- Minimum size: 700x500px
- App identifier: com.allclock.clock
