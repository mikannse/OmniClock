# Omni Clock 部署指南

本文档描述如何构建、签名和发布 Omni Clock 的各平台版本。

---

## 目录

1. [版本管理](#版本管理)
2. [本地构建](#本地构建)
3. [发布流程](#发布流程)
4. [CI/CD（GitHub Actions）](#cicdgithub-actions)
5. [自动更新配置](#自动更新配置)
6. [平台特定注意事项](#平台特定注意事项)
7. [故障排查](#故障排查)

---

## 版本管理

Omni Clock 使用 **手动版本同步**。版本号必须一致地更新在以下三个文件中：

| 文件 | 字段 |
|------|------|
| `package.json` | `"version": "x.y.z"` |
| `src-tauri/tauri.conf.json` | `"version": "x.y.z"` |
| `src-tauri/Cargo.toml` | `version = "x.y.z"` |

**注意**: `scripts/release.mjs` 已于先前移除。版本号现在需要手动同步编辑上述三个文件。

### 发布前检查清单

- [ ] 三个文件中的版本号完全一致
- [ ] `src-tauri/tauri.conf.json` 中 `bundle.createUpdaterArtifacts` 为 `true`
- [ ] `CHANGELOG.md` 已更新
- [ ] 所有修改已提交到 git

---

## 本地构建

### 构建前端

```bash
npm run build
```

生成 `dist/` 目录，包含静态前端资源。

### 构建桌面应用

```bash
npm run tauri build
```

Tauri 会：
1. 自动运行 `npm run build`
2. 编译 Rust 后端
3. 打包生成平台原生安装程序

构建产物位于 `src-tauri/target/release/bundle/`：

| 平台 | 产物路径 |
|------|----------|
| macOS | `src-tauri/target/release/bundle/macos/*.dmg` |
| Windows | `src-tauri/target/release/bundle/msi/*.msi` |
| Linux | `src-tauri/target/release/bundle/deb/*.deb` |

---

## 发布流程

发布由 **Git 标签** 驱动。推送 `v*` 标签会自动触发 GitHub Actions 构建。

### 手动发布步骤

```bash
# 1. 确保所有更改已提交
git status

# 2. 创建版本提交（示例：发布 v0.8.0）
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml CHANGELOG.md
git commit -m "release: bump version to v0.8.0"

# 3. 打标签
git tag v0.8.0

# 4. 推送提交和标签
git push origin main
git push origin v0.8.0
```

推送标签后，`.github/workflows/release.yml` 会自动执行构建和发布。

---

## CI/CD（GitHub Actions）

### 工作流概览

文件: `.github/workflows/release.yml`

触发条件: `push` 事件匹配 `v*` 标签

执行步骤：

1. **`verify` 任务**
   - 校验 `package.json` 和 `tauri.conf.json` 版本是否一致
   - 校验 `bundle.createUpdaterArtifacts` 是否为 `true`
   - 任一校验失败则终止构建

2. **`build` 任务**
   - 运行矩阵构建：
     - `macos-latest`
     - `ubuntu-22.04`
     - `windows-latest`
   - 使用 `tauri-apps/tauri-action@v0` 执行构建
   - 签名更新产物（需要 `TAURI_SIGNING_PRIVATE_KEY`）

3. **发布**
   - 创建 GitHub Release
   - 上传构建产物（DMG / MSI / DEB / AppImage）
   - 上传 `latest.json`（更新器 manifest）

### 必需的 Secrets

在仓库 Settings → Secrets and variables → Actions 中配置：

| Secret | 说明 |
|--------|------|
| `TAURI_SIGNING_PRIVATE_KEY` | 用于签名更新产物，必须与 `tauri.conf.json` 中的 `pubkey` 配对 |

### 公钥配置

`src-tauri/tauri.conf.json`:

```json
"plugins": {
  "updater": {
    "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDFGM0FGMzZBMjg1NzE3REQKUldUZEYxY29hdk02SDFrL0FDRTc0ZWRyUEU4NkFOdEJHWkJTNGZYNFZ5ek0wMnRMVWFZNytyZ2oK",
    "endpoints": [
      "https://github.com/mikannse/OmniClock/releases/latest/download/latest.json"
    ]
  }
}
```

私钥通过 `tauri signer generate` 生成，**必须安全保管**，不可泄露到仓库中。

---

## 自动更新配置

### 更新检查流程

1. 应用启动时或用户在设置中点击「检查更新」
2. 前端调用 `check()`（来自 `@tauri-apps/plugin-updater`）
3. 插件向 `endpoints` 请求 `latest.json`
4. 如果有新版本，弹出确认对话框
5. 用户确认后，调用 `downloadAndInstall()` 下载并安装
6. 下载完成后提示重启，调用 `invoke('relaunch_app')`

### `latest.json` 结构

由 CI 自动生成，包含版本号、发布说明、各平台下载链接和签名。

---

## 平台特定注意事项

### macOS

**签名与公证**：
- 当前构建的 DMG 是**未签名、未公证**的
- 用户首次打开可能看到 **"App is damaged and can't be opened"**
- 临时解决方案：运行 `xattr -cr "/Applications/Omni Clock.app"`
- 长期方案：注册 Apple Developer ID（$99/年），在 CI 中配置签名证书

**自动更新限制**：
- 未签名的应用在 macOS 上可能无法通过 `downloadAndInstall` 成功替换自身
- 错误会通过对话框提示用户手动下载

### Windows

- MSI 安装包在 Windows 10/11 上正常工作
- 自动更新通过替换应用文件实现，通常不受限制

### Linux

- 生成 `.deb` 和 AppImage 两种格式
- DEB 包适用于 Debian/Ubuntu 系发行版
- AppImage 具有更好的跨发行版兼容性

---

## 故障排查

### CI 构建失败：版本不一致

错误信息示例：
```
Error: package.json version (0.7.1) does not match tauri.conf.json version (0.7.2)
```

**解决**: 手动同步三个文件的版本号后重新推送标签。

### CI 构建失败：`createUpdaterArtifacts` 为 false

错误信息示例：
```
Error: bundle.createUpdaterArtifacts must be true for release builds
```

**解决**: 检查 `src-tauri/tauri.conf.json`，确保 `bundle.createUpdaterArtifacts` 为 `true`。

### 更新检查失败："Could not fetch a valid release JSON"

**原因**: `latest.json` 尚未上传到 Release，或网络无法访问 GitHub。

**解决**:
- 确认 CI 已完成并成功上传 `latest.json`
- 检查 `endpoints` URL 是否正确
- 检查用户网络是否能访问 GitHub Releases

### 构建产物过大

Tauri 应用包含 WebView 运行时，体积通常在 5-15MB 之间，属于正常范围。可通过以下方式优化：
- 检查 `node_modules` 是否包含未使用的依赖
- 确保 Vite 构建启用 tree-shaking

---

## 回滚流程

如果需要回滚到旧版本：

1. 在 GitHub Releases 页面删除有问题的 Release
2. 重新上传旧版本的 `latest.json`（或修改其内容指向旧版本）
3. 如果已推送的 tag 需要撤销：
   ```bash
   git push --delete origin v0.x.x
   git tag --delete v0.x.x
   ```
