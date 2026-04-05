# Omni Clock / 万能时钟

[English](README.md) · [中文](README_zh.md)

---

## Omni Clock

A versatile desktop clock application with timer, Pomodoro, stopwatch, and countdown features.

### Features

| Module | Description |
|--------|-------------|
| **Segmented Timer** | Create custom timed exam configurations with multiple segments |
| **Pomodoro Timer** | Focus timer with work/short break/long break cycles |
| **Stopwatch** | Standard stopwatch with lap recording |
| **Countdown Timer** | Simple countdown with visual progress ring |
| **Settings** | Notifications, sounds, themes (light/dark/system) |

### Tech Stack

- **Frontend**: React 19, TypeScript, TailwindCSS 4.x
- **Backend**: Tauri 2.x (Rust)
- **State**: React Context + useReducer
- **Persistence**: Tauri fs plugin → JSON in AppData

### Quick Start

```bash
git clone https://github.com/omniconclock/omni-clock.git
cd omni-clock
npm install
npm run tauri dev
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run tauri dev` | Start development |
| `npm run tauri build` | Build production |
| `npm run dev` | Frontend only |
| `npx tsc --noEmit` | TypeScript check |

### Data Storage

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\OmniClock\data\` |
| macOS | `~/Library/Application Support/com.omniconclock/data/` |
| Linux | `~/.config/OmniClock/data/` |

### Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

### License

MIT License - see [LICENSE](LICENSE).

