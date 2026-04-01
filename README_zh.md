# Omni Clock / 万能时钟

[English](README.md) · [中文](README_zh.md)

---

## 万能时钟

一款多功能桌面时钟应用，支持计时器、番茄钟、秒表和倒计时功能。

### 功能特点

| 模块 | 描述 |
|------|------|
| **分段计时器** | 创建自定义考试配置，支持多个时间段 |
| **番茄钟** | 专注计时器，包含工作/短休息/长休息循环 |
| **秒表** | 标准秒表，支持计次 |
| **倒计时** | 简洁倒计时，带可视化进度环 |
| **设置** | 通知、声音、主题（浅色/深色/系统） |

### 技术栈

- **前端**: React 19, TypeScript, TailwindCSS 4.x
- **后端**: Tauri 2.x (Rust)
- **状态管理**: React Context + useReducer
- **数据持久化**: Tauri fs 插件 → JSON 存储在 AppData

### 快速开始

```bash
git clone https://github.com/omniconclock/omni-clock.git
cd omni-clock
npm install
npm run tauri dev
```

### 常用命令

| 命令 | 描述 |
|------|------|
| `npm run tauri dev` | 启动开发 |
| `npm run tauri build` | 构建生产版本 |
| `npm run dev` | 仅前端 |
| `npx tsc --noEmit` | TypeScript 类型检查 |

### 数据存储

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%\OmniClock\data\` |
| macOS | `~/Library/Application Support/com.omniconclock/data/` |
| Linux | `~/.config/OmniClock/data/` |

### 贡献

欢迎贡献代码！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

### 许可证

MIT 许可证 - 参见 [LICENSE](LICENSE)。
