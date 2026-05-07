# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.1] - 2025-05-07

### Added

- **Documentation**: 新增完整项目文档（架构、开发、部署指南），改进 CHANGELOG 和贡献指南

## [0.7.2] - 2025-05-07

### Fixed

- **Updater**: 增加下载进度显示和安装完成后重启提示，改善更新体验

## [0.7.1] - 2025-05-07

### Fixed

- **Audit Issues**: 修复跨计时器 Context、存储层和主题系统的多处审计问题

## [0.6.4] - 2025-04-28

### Changed

- **Icons**: 更新应用图标为自定义设计

## [0.6.3] - 2025-04-28

### Fixed

- **Process Name**: 将包名从 `tauri-app` 更正为 `omni-clock`，修复进程名显示问题
- **Updater**: 改进更新下载流程，增加进度反馈和错误处理

## [0.6.2] - 2025-04-27

### Fixed

- **Timer Accuracy**: 使用基于时间的计算替代 tick 累加，解决后台标签页计时失准问题
- **Pomodoro Accuracy**: 番茄钟同样采用基于 `Date.now()` 差值的计算方式
- **Background Transitions**: 使用 `setTimeout` 调度 segment/状态转换，确保即使浏览器节流也能在正确时间点触发
- **Autostart**: 修复 `MacosLauncher` 枚举使用，确保跨平台自启动兼容性

## [0.6.1] - 2025-04-26

### Fixed

- **Cross-Platform**: 改进跨平台兼容性

## [0.5.1] - 2025-04-25

### Fixed

- **TypeScript**: 添加 `error.cause` 类型断言以支持 ES2020 lib
- **Cross-Platform**: 进一步修复跨平台兼容问题

## [0.5.0] - 2025-04-25

### Added

- **Auto-Update**: 集成 Tauri 自动更新功能，支持检查、下载和安装新版本

## [0.4.6] - 2025-04-24

### Changed

- **CI**: 升级 Node.js 至 v22，适配新版 GitHub Actions runner

## [0.4.5] - 2025-04-24

### Fixed

- **Dependencies**: 更新 npm 包版本以匹配 Cargo 依赖
- **Build**: 更新 Cargo.lock 以兼容 `tauri-plugin-dialog` v2.7

## [0.4.0] - 2025-04-23

### Added

- **Release Scripts**: 添加自动化发布脚本（后于 v0.4.5 移除）
- **CI Version Check**: 在 CI 中增加版本一致性校验

## [0.3.0] - 2025-04-22

### Added

- **Autostart**: 新增开机自启动功能，支持最小化启动
- **Settings Sync**: 应用启动时同步自启动设置状态

## [0.2.0] - 2025-04-21

### Added

- **Custom Title Bar**: 自定义标题栏，支持窗口拖拽和控制按钮
- **Sound Effects**: 为所有计时模块添加音效（开始、结束、悬停）
- **UI Polish**: 按钮悬停缩放动画、响应式布局优化
- **Timer Controls**: 为分段计时器增加分钟增减按钮

## [0.1.0] - 2025-04-20

### Added

- **Segmented Timer**: 自定义分段计时器，支持多阶段配置（考试、学习、routine）
- **Pomodoro Timer**: 番茄工作法计时器，支持工作/短休息/长休息循环
- **Stopwatch**: 标准秒表，支持圈速记录
- **Countdown Timer**: 倒计时器，支持预设和直接输入
- **System Tray**: 系统托盘支持（显示/隐藏、开始工作、退出）
- **Internationalization**: 6 种语言支持（英语、简体中文、繁体中文、日语、法语、德语）
- **Theme Support**: 亮色/暗色/系统主题切换
- **Settings Persistence**: 所有设置持久化到 AppData
- **Notifications**: 桌面通知提醒

### Tech Stack

- Tauri 2.x (Rust backend)
- React 19 with TypeScript
- TailwindCSS 4.x
- React Context for state management
