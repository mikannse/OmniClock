# Omni Clock 文档中心

欢迎来到 Omni Clock 的文档中心。这里汇集了项目的所有技术文档，帮助开发者快速理解、上手和贡献代码。

---

## 文档索引

| 文档 | 说明 | 目标读者 |
|------|------|----------|
| [README.md](../README.md) | 项目简介、功能特性、快速开始 | 所有用户 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 系统架构、数据流、设计模式 | 开发者 |
| [DEVELOPMENT.md](DEVELOPMENT.md) | 开发环境搭建、代码规范、调试技巧 | 贡献者 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 构建流程、发布步骤、CI/CD | 维护者 |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 贡献流程、PR 规范 | 贡献者 |
| [CHANGELOG.md](../CHANGELOG.md) | 版本变更历史 | 所有用户 |

---

## 项目一句话介绍

Omni Clock（万能时钟）是一款基于 **Tauri 2.x + React 19 + TypeScript** 构建的跨平台桌面时钟应用，提供分段计时器、番茄钟、秒表和倒计时四大核心模块。

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/mikannse/OmniClock.git
cd OmniClock

# 安装依赖
npm install

# 启动开发环境（前端 + Tauri）
npm run tauri dev
```

更多细节请参阅 [DEVELOPMENT.md](DEVELOPMENT.md)。

## 技术栈概览

- **前端框架**: React 19 + TypeScript 5.8
- **样式方案**: Tailwind CSS 4.x + CSS 变量主题系统
- **桌面壳层**: Tauri 2.x（Rust 后端）
- **状态管理**: React Context + useReducer
- **数据持久化**: Tauri fs 插件 → AppData JSON 文件
- **国际化**: i18next + react-i18next（6 种语言）
- **构建工具**: Vite 7
