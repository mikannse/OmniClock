# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-01

### Added

- **Segmented Timer**: Custom timed exam configurations with multiple segments
- **Pomodoro Timer**: Focus timer with work/short break/long break cycles
- **Stopwatch**: Standard stopwatch with lap recording
- **Countdown Timer**: Simple countdown with circular progress ring
- **System Tray**: Minimize to tray with context menu (Show/Hide, Start Work, Quit)
- **Internationalization**: Support for 6 languages (EN, ZH, ZH-TW, JA, FR, DE)
- **Theme Support**: Light, dark, and system theme options
- **Settings Persistence**: All settings saved to AppData
- **Notifications**: Desktop notifications for timer completion

### Tech Stack

- Tauri 2.x (Rust backend)
- React 19 with TypeScript
- TailwindCSS 4.x
- React Context for state management
