# Omni Clock / 万能时钟

[English](README.md) · [中文](README_zh.md)

---

## Omni Clock

A desktop clock suite with timer, Pomodoro, stopwatch, and countdown modules.

### Features

| Module | Description |
|--------|-------------|
| **Segmented Timer** | Build custom multi-stage timers for study, exams, or routines |
| **Pomodoro** | Focus timer with work, short break, and long break cycles |
| **Stopwatch** | Standard stopwatch with lap tracking |
| **Countdown** | Quick countdown timer with presets and direct time input |
| **Settings** | Notifications, sounds, themes, language, autostart, and tray behavior |

### Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Desktop Shell**: Tauri 2 + Rust
- **State**: React Context + useReducer
- **Persistence**: JSON files stored in app data

### Quick Start

```bash
git clone https://github.com/mikannse/OmniClock.git
cd OmniClock
npm install
npm run tauri dev
```

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run tauri dev` | Start the desktop app in development mode |
| `npm run tauri build` | Build the production app |
| `npm run build` | Build the frontend bundle |
| `npm run release:prepare -- 0.4.6` | Update release versions across project files |

### Data Storage

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\OmniClock\data\` |
| macOS | `~/Library/Application Support/OmniClock/data/` |
| Linux | `~/.config/OmniClock/data/` |

### Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

### License

MIT License. See [LICENSE](LICENSE).
