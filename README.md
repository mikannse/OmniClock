# Omni Clock / 万能时钟

<div align="center">

[![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC107?style=flat-square&logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-FF5722?style=flat-square)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/omniconclock/omni-clock?style=flat-square)](https://github.com/omniconclock/omni-clock/commits/main)

**Omni Clock** is a versatile desktop clock application with timer, Pomodoro, stopwatch, and countdown features.

[English](#english) · [中文](#中文)

</div>

---

## English

### About

**Omni Clock** is a multi-module clock application designed for students, professionals, and anyone who needs efficient time management tools. Built with Tauri 2.x + React + TypeScript, it offers native desktop performance with a modern, clean UI.

### Features

| Module | Description |
|--------|-------------|
| **Segmented Timer** | Create custom timed exam configurations with multiple segments |
| **Pomodoro Timer** | Focus timer with work/short break/long break cycles, system tray integration |
| **Stopwatch** | Standard stopwatch with lap recording |
| **Countdown Timer** | Simple countdown with visual progress ring |
| **Settings** | Notifications, sounds, themes (light/dark/system) |

**Additional Features:**
- System tray with quick actions
- 6 languages: EN, ZH, ZH-TW, JA, FR, DE
- Persistent settings storage
- Native desktop notifications

### Tech Stack

```
Frontend     ▶  React 19, TypeScript, TailwindCSS 4.x
Backend      ▶  Tauri 2.x (Rust)
State        ▶  React Context + useReducer
Persistence  ▶  Tauri fs plugin → JSON in AppData
Icons        ▶  lucide-react
```

### Quick Start

```bash
# Clone the repository
git clone https://github.com/omniconclock/omni-clock.git
cd omni-clock

# Install dependencies
npm install

# Start development
npm run tauri dev
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run tauri dev` | Start development server (frontend + Tauri) |
| `npm run tauri build` | Build production executable |
| `npm run dev` | Frontend only (Vite) |
| `npm run build` | Frontend production build |
| `npx tsc --noEmit` | TypeScript type check |

### Data Storage

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\OmniClock\data\` |
| macOS | `~/Library/Application Support/com.omniconclock/data/` |
| Linux | `~/.config/OmniClock/data/` |

**Files:**
- `configs.json` - Timer configurations
- `settings.json` - App settings
- `pomodoro.json` - Pomodoro settings

### Project Structure

```
omni-clock/
├── src/
│   ├── components/       # UI components by feature
│   ├── contexts/         # React Context providers
│   ├── i18n/              # Internationalization
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── src-tauri/
│   ├── src/lib.rs         # Rust entry + tray
│   └── capabilities/      # Tauri permissions
├── .github/
│   ├── ISSUE_TEMPLATE/    # Bug/feature/question templates
│   └── PULL_REQUEST_TEMPLATE.md
├── package.json
└── LICENSE
```

### Versioning

Update version in `package.json`, then rebuild:

```bash
npm run tauri build
```

---

## 中文

### 简介

**Omni Clock（万能时钟）** 是一款多功能桌面时钟应用，专为学生、专业人士和需要高效时间管理工具的用户设计。基于 Tauri 2.x + React + TypeScript 构建，提供原生桌面性能和现代简洁的界面。

### 功能特点

| 模块 | 描述 |
|------|------|
| **分段计时器** | 创建自定义考试配置，支持多个时间段 |
| **番茄钟** | 专注计时器，包含工作/短休息/长休息循环，托盘集成 |
| **秒表** | 标准秒表，支持计次 |
| **倒计时** | 简洁倒计时，带可视化进度环 |
| **设置** | 通知、声音、主题（浅色/深色/系统） |

**其他功能：**
- 系统托盘快速操作
- 6 种语言：英语、简体中文、繁体中文、日语、法语、德语
- 设置持久化存储
- 原生桌面通知

### 技术栈

```
前端      ▶  React 19, TypeScript, TailwindCSS 4.x
后端      ▶  Tauri 2.x (Rust)
状态管理  ▶  React Context + useReducer
数据持久化▶  Tauri fs 插件 → JSON 存储在 AppData
图标      ▶  lucide-react
```

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/omniconclock/omni-clock.git
cd omni-clock

# 安装依赖
npm install

# 启动开发
npm run tauri dev
```

### 常用命令

| 命令 | 描述 |
|------|------|
| `npm run tauri dev` | 启动开发服务器（前端 + Tauri） |
| `npm run tauri build` | 构建生产版本 |
| `npm run dev` | 仅前端开发服务器 |
| `npm run build` | 前端生产构建 |
| `npx tsc --noEmit` | TypeScript 类型检查 |

### 数据存储

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%\OmniClock\data\` |
| macOS | `~/Library/Application Support/com.omniconclock/data/` |
| Linux | `~/.config/OmniClock/data/` |

**文件：**
- `configs.json` - 计时器配置
- `settings.json` - 应用设置
- `pomodoro.json` - 番茄钟设置

### 项目结构

```
omni-clock/
├── src/
│   ├── components/       # 按功能分类的 UI 组件
│   ├── contexts/         # React Context 状态提供者
│   ├── i18n/             # 国际化配置
│   ├── types/            # TypeScript 类型定义
│   └── utils/            # 工具函数
├── src-tauri/
│   ├── src/lib.rs        # Rust 入口 + 托盘
│   └── capabilities/     # Tauri 权限配置
├── .github/
│   ├── ISSUE_TEMPLATE/   # 问题/功能/提问模板
│   └── PULL_REQUEST_TEMPLATE.md
├── package.json
└── LICENSE
```

### 版本更新

在 `package.json` 中更新版本号，然后重新构建：

```bash
npm run tauri build
```

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.
