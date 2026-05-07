# Omni Clock 开发指南

本文档面向希望参与 Omni Clock 开发或自定义的开发者，涵盖环境搭建、开发流程、调试技巧和代码规范。

---

## 目录

1. [前置要求](#前置要求)
2. [环境搭建](#环境搭建)
3. [常用命令](#常用命令)
4. [开发工作流](#开发工作流)
5. [调试技巧](#调试技巧)
6. [代码规范](#代码规范)
7. [添加新模块](#添加新模块)
8. [常见问题](#常见问题)

---

## 前置要求

| 工具 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 22.x | 使用 LTS 版本 |
| npm | 10.x | 随 Node.js 附带 |
| Rust | 1.80+ | 安装 [rustup](https://rustup.rs/) |
| Tauri CLI | 2.x | `cargo install tauri-cli`（可选，npm 脚本已封装） |

### 平台特定要求

**macOS**: 
- Xcode Command Line Tools: `xcode-select --install`

**Windows**:
- Microsoft Visual C++ Build Tools
- WebView2 Runtime（Windows 10/11 通常已预装）

**Linux**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

---

## 环境搭建

```bash
# 1. 克隆仓库
git clone https://github.com/mikannse/OmniClock.git
cd OmniClock

# 2. 安装前端依赖
npm install

# 3. 验证 Rust 环境（Tauri 会自动处理）
rustc --version
cargo --version

# 4. 启动开发服务器
npm run tauri dev
```

首次启动 `npm run tauri dev` 时，Tauri 会自动下载 Rust 依赖并编译，可能需要几分钟。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 仅启动前端 Vite 开发服务器（浏览器模式，无 Tauri API） |
| `npm run tauri dev` | 启动完整桌面应用（前端 + Tauri，推荐） |
| `npm run build` | 构建前端生产包 |
| `npm run tauri build` | 构建生产级桌面应用（生成安装包） |
| `npx tsc --noEmit` | TypeScript 类型检查 |
| `npm run preview` | 预览前端生产构建 |

---

## 开发工作流

### 1. 分支命名

```
feature/<描述>     # 新功能
fix/<描述>         # Bug 修复
refactor/<描述>    # 重构
docs/<描述>        # 文档更新
```

### 2. 修改计时器逻辑时的检查清单

计时器逻辑是整个项目最敏感的部分。修改时必须同时检查：

- [ ] `setInterval`（显示刷新）和 `setTimeout`（状态转换）是否同步更新
- [ ] `startedAtRef` 是否正确重置/恢复
- [ ] `visibilitychange` 监听器是否清除和重新注册
- [ ] 暂停/恢复时 `startedAtRef` 是否通过 `Date.now() - elapsedMs` 重新计算
- [ ] 休眠恢复后是否能正确处理 overdue 转换

### 3. 添加持久化数据时的检查清单

- [ ] 在 `src/types/index.ts` 中定义类型
- [ ] 在 `src/utils/storage.ts` 中添加 `loadXxx()` 和 `saveXxx()`
- [ ] 添加 `isValidXxx()` 运行时校验函数
- [ ] 在 Context 的 `useEffect` 中调用加载函数
- [ ] 在修改函数中调用保存函数并处理错误

### 4. 添加翻译文本时的检查清单

- [ ] 同时更新 `src/i18n/locales/` 下的 **6 个** JSON 文件
- [ ] 保持 key 命名风格一致（小写驼峰）
- [ ] 如果涉及托盘菜单文本，调用 `invoke('update_tray_labels', ...)` 同步更新

---

## 调试技巧

### 前端调试

开发模式下自动打开 DevTools（`#[cfg(debug_assertions)]` 中调用 `window.open_devtools()`）。

常用调试方法：
- **React DevTools**: 检查组件树和 props
- **Console**: 查看计时器状态、持久化加载错误
- **Network**: 检查 updater 请求（`releases/latest/download/latest.json`）

### Rust 后端调试

在 `src-tauri/src/lib.rs` 中使用 `println!` 或 `log::info!`（需添加 `log` crate），输出会在运行 `npm run tauri dev` 的终端中显示。

### 计时器调试

如果怀疑计时器在后台/休眠后不准确：

1. 在浏览器 DevTools Console 中手动测试：
   ```javascript
   // 模拟 5 分钟后唤醒
   // 观察剩余时间是否立即更新
   ```
2. 检查 `visibilitychange` 事件是否正确触发：
   ```javascript
   document.addEventListener('visibilitychange', () => {
     console.log('visibility changed:', document.visibilityState);
   });
   ```
3. 在 `updateDisplay` 和 `scheduleSegmentTransition` 中添加 `console.log` 追踪执行。

### 持久化调试

查看实际存储的 JSON 文件：

```bash
# macOS
cat ~/Library/Application\ Support/OmniClock/data/settings.json

# Windows
type %APPDATA%\OmniClock\data\settings.json

# Linux
cat ~/.config/OmniClock/data/settings.json
```

---

## 代码规范

### TypeScript

- **严格模式**: 项目启用 `strict: true`，不允许隐式 `any`
- **类型定义**: 所有函数参数和返回值必须显式标注类型
- **接口命名**: 使用 `PascalCase`，如 `TimerConfig`, `PomodoroState`
- **类型导出**: 所有共享类型从 `src/types/index.ts` 集中导出

### React

- **函数组件**: 全部使用函数组件 + Hooks
- **Context 使用**: 必须配合自定义 Hook，禁止直接使用 `useContext(SomeContext)`
  ```typescript
  // 正确
  const { settings } = useTimerContext();

  // 错误
  const { settings } = useContext(TimerContext);
  ```
- **Effect 清理**: 所有 `setInterval`/`setTimeout`/`addEventListener` 必须在 cleanup 函数中清除
- **Ref 模式**: 使用 `useRef` 保存需要在闭包中访问的最新值，避免 stale closure

### 样式

- **Tailwind**: 优先使用 Tailwind 工具类，复杂场景使用 `cn()` 合并
- **CSS 变量**: 主题相关颜色必须通过 CSS 变量（`--background`, `--foreground` 等）
- **暗色模式**: 通过 `.dark` 类切换，不要写死颜色值

### Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

类型：
- `feat` — 新功能
- `fix` — Bug 修复
- `refactor` — 代码重构
- `docs` — 文档更新
- `test` — 测试相关
- `chore` — 维护任务
- `perf` — 性能优化
- `ci` — CI/CD 变更

---

## 添加新模块

如果要添加一个新的计时模块（例如「间隔训练」），参考以下步骤：

### 1. 定义类型

在 `src/types/index.ts` 中添加：

```typescript
export interface IntervalSettings {
  workSeconds: number;
  restSeconds: number;
  rounds: number;
}

export interface IntervalState {
  status: 'idle' | 'working' | 'resting' | 'finished';
  currentRound: number;
  remainingSeconds: number;
}
```

### 2. 创建 Context

复制 `src/contexts/CountdownContext.tsx` 作为模板，修改状态逻辑。

关键要求：
- 使用 `useReducer` + 显式 Action 类型
- 使用 `Date.now()` 差值计算时间
- 实现 `setTimeout` 状态转换调度
- 添加 `visibilitychange` 监听
- 导出 `useXxxContext()` Hook

### 3. 注册 Provider

在 `src/App.tsx` 的 Provider 嵌套链中插入新 Provider：

```tsx
<CountdownProvider>
  <IntervalProvider>  {/* 插入位置 */}
    <CustomTitleBar />
    ...
  </IntervalProvider>
</CountdownProvider>
```

### 4. 添加导航和视图

- 在 `NAV_ITEMS` 中添加新模块
- 在 `renderModule()` switch 中添加 case
- 创建 `src/components/Interval/IntervalView.tsx`

### 5. 添加持久化（如果需要）

在 `src/utils/storage.ts` 中添加加载/保存函数。

---

## 常见问题

### Q: `npm run tauri dev` 卡在 "Compiling..."

Rust 首次编译较慢（可能需要 3-10 分钟）。后续增量编译会很快。确保网络畅通以下载 Rust crate。

### Q: 前端热更新后 Tauri API 报错

有时 Vite HMR 会导致 Tauri API 状态异常。按 `Ctrl+C` 停止后重新运行 `npm run tauri dev`。

### Q: macOS 上通知不显示

检查系统设置 → 通知 → Omni Clock，确保通知权限已开启。Tauri 通知插件在 macOS 上存在已知兼容性问题，项目已使用 AppleScript 作为替代方案。

### Q: 修改 `tauri.conf.json` 后没有生效

Tauri 配置变更需要完全重启开发服务器（`Ctrl+C` 后重新运行 `npm run tauri dev`），HMR 不会重新加载 Rust 后端配置。

### Q: 运行时出现 "useXxxContext must be used within XxxProvider"

检查组件是否在正确的 Provider 层级内渲染。例如 `usePomodoroContext` 必须在 `PomodoroProvider` 内部。
