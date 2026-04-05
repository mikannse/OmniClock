# Omni Clock / 万能时钟

[English](README.md) · [中文](README_zh.md)

---

## 万能时钟

一个包含计时器、番茄钟、秒表和倒计时的桌面时钟工具集。

### 功能特性

| 模块 | 说明 |
|------|------|
| **分段计时器** | 适合学习、考试或流程训练的多阶段计时 |
| **番茄钟** | 支持工作、短休息、长休息循环 |
| **秒表** | 支持计次记录的标准秒表 |
| **倒计时** | 支持预设和直接输入时间的倒计时 |
| **设置** | 通知、声音、主题、语言、开机启动和托盘行为 |

### 技术栈

- **前端**：React 19、TypeScript、Tailwind CSS 4
- **桌面壳**：Tauri 2 + Rust
- **状态管理**：React Context + useReducer
- **数据持久化**：保存在应用数据目录中的 JSON 文件

### 快速开始

```bash
git clone https://github.com/mikannse/OmniClock.git
cd OmniClock
npm install
npm run tauri dev
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run tauri dev` | 启动桌面开发环境 |
| `npm run tauri build` | 构建生产版本 |
| `npm run build` | 构建前端资源 |
| `npm run release:prepare -- 0.4.6` | 同步更新项目内的发布版本号 |

### 数据存储位置

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%\OmniClock\data\` |
| macOS | `~/Library/Application Support/OmniClock/data/` |
| Linux | `~/.config/OmniClock/data/` |

### 贡献

欢迎提交 Issue 和 Pull Request。详情见 [CONTRIBUTING.md](CONTRIBUTING.md)。

### 许可证

MIT License，详见 [LICENSE](LICENSE)。
