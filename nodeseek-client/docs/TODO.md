# NodeSeek DeepFlood 客户端 — 待扩展功能清单

> 本文档基于对当前代码库的全面审查，梳理出各功能模块的完成状态和待扩展内容。  
> 按优先级和所属阶段划分，供后续迭代参考。  
> **最后更新时间：2026-02-15**

---

## 一、代码审查发现并已修复的问题

| # | 问题描述 | 文件 | 严重程度 | 状态 |
|---|---------|------|---------|------|
| 1 | `browserElectronApi` mock 缺少 `incrementVisit`、`batch`、`folders` API，浏览器开发模式下文件夹/批量操作崩溃 | `src/renderer/mocks/browserElectronApi.ts` | 高 | ✅ 已修复 |
| 2 | `ResourceMonitor` 使用 `process.getProcessMemoryInfo?.()` — 该 API 仅在渲染进程可用，主进程应使用 `process.memoryUsage()` | `src/main/services/resourceMonitor.ts` | 高 | ✅ 已修复 |
| 3 | `powerMonitor.on('suspend'/'resume')` 每次调用 `start()` 都会重复注册事件监听器，造成内存泄漏 | `src/main/services/resourceMonitor.ts` | 高 | ✅ 已修复 |
| 4 | `normalizeAddress` 正则不支持带路径的裸域名（如 `nodeseek.com/post/123`），会被错误识别为搜索关键字 | `src/renderer/utils/url.ts` | 中 | ✅ 已修复 |
| 5 | `updateBookmark` / `updateFolder` 直接将 payload key 拼接进 SQL 字符串，存在 SQL 注入风险 | `src/main/services/bookmarkManager.ts` | 高 | ✅ 已修复（白名单方式） |
| 6 | 应用退出时未调用 `bookmarkManager.dispose()` / `resourceMonitor.dispose()` 清理资源 | `src/main/main.ts` | 中 | ✅ 已修复 |
| 7 | `closeTab` 关闭当前标签页后直接选中第一个标签页，而非相邻标签页，UX 不佳 | `src/main/services/tabManager.ts` | 低 | ✅ 已修复 |
| 8 | `webview` JSX 类型定义中 `allowpopups` 应为 `string` 而非 `boolean`；缺少 `reloadIgnoringCache` 声明 | `src/renderer/types/jsx.d.ts` | 低 | ✅ 已修复 |
| 9 | `.gitignore` 忽略了 `package-lock.json`，但 CI（GitHub Actions）的 `npm ci` 依赖它 | `.gitignore` | 中 | ✅ 已修复 |
| 10 | `replaceAllBookmarks` 方法为死代码且缺少多个字段，已清除 | `src/main/services/bookmarkManager.ts` | 低 | ✅ 已修复 |
| 11 | `tsconfig.base.json` 的 `module: ESNext` 与 `moduleResolution: NodeNext` 不兼容 | `tsconfig.base.json` | 中 | ✅ 已修复 |
| 12 | `BookmarkRecord`/`BookmarkFolder` 接口使用 `created_at`/`updated_at`（snake_case），但 `mapDbRowToObject` 返回 `createdAt`/`updatedAt`（camelCase），导致运行时字段访问返回 `undefined` | `src/shared/types/bookmarks.ts` 等 | **高** | ✅ 已修复（本次） |
| 13 | `getLocalSyncHash` 访问 `status?.sync_hash`，经 `mapDbRowToObject` 后字段名为 `syncHash`，导致同步哈希始终返回 `null`，WebDAV 同步比较永远不匹配 | `src/main/services/bookmarkManager.ts` | **高** | ✅ 已修复（本次） |
| 14 | `mergeBookmarks` 中日期字段使用 `.created_at`/`.updated_at` 但运行时数据为 `.createdAt`/`.updatedAt`，导致 WebDAV 合并时日期比较全部失败 | `src/main/services/bookmarkManager.ts` | **高** | ✅ 已修复（本次） |
| 15 | `LoginPanel` 中 `onLogin` 未 `await`：异步回调不等待完成，错误不会被 catch 捕获，成功消息在登录完成前就显示 | `src/renderer/components/LoginPanel.tsx` | **中** | ✅ 已修复（本次） |
| 16 | `resourceMonitor.test.ts` 中 `powerMonitor` mock 缺少 `removeListener` 方法，`dispose()` 测试不完整 | `src/main/services/__tests__/resourceMonitor.test.ts` | 低 | ✅ 已修复（本次） |

---

## 二、P0 优先级功能完成状态

> 所有 P0 优先级功能均已完成实现。

| # | 功能 | 状态 | 实现文件 | 说明 |
|---|------|------|---------|------|
| U-1 | 设置面板 | ✅ **已完成** | `src/renderer/components/SettingsPanel.tsx` | 完整 UI，支持主题、资源限制、WebDAV、安全、认证、会话全部配置项 |
| U-2 | 键盘快捷键 | ✅ **已完成** | `src/renderer/hooks/useKeyboardShortcuts.ts` | 支持 `Ctrl/Cmd+T/W/R/L/1-9/Tab/Shift+Tab/D/B` |
| U-11 | React Error Boundary | ✅ **已完成** | `src/renderer/components/ErrorBoundary.tsx` | 捕获渲染层错误，显示友好的错误信息和重新载入按钮 |
| A-1 | 登录界面 | ✅ **已完成** | `src/renderer/components/LoginPanel.tsx` | 用户名/密码登录表单、OAuth 占位、地址栏登录状态显示 |
| S-1 | 会话持久化 | ✅ **已完成** | `src/main/session/sessionManager.ts` | 使用 `electron-store` 将 cookie 快照持久化到磁盘 |
| S-2 | 标签页状态恢复 | ✅ **已完成** | `src/main/services/tabManager.ts` | 使用 `electron-store` 保存/恢复标签页 URL、状态等信息 |
| B-4 | 快速收藏当前页 | ✅ **已完成** | `src/renderer/components/AddressBar.tsx` | 地址栏星号按钮，一键收藏/取消收藏，自动填充标题和 URL |
| B-6 | 数据库列名映射 | ✅ **已完成** | `src/main/services/bookmarkManager.ts` | `mapDbRowToObject` 统一转换 snake_case → camelCase，接口字段名已修复一致 |
| T-1 | 单元测试可运行 | ✅ **已完成** | `src/main/services/__tests__/setup.ts` | 完整 mock Electron `app`、`keytar`、`electron-store`，35 个测试全部通过 |

---

## 三、待扩展功能详细列表

### 阶段二：认证系统（Auth） — 当前状态：基础功能已完成

**已完成：** `AuthManager` 使用 `keytar` 存储凭证，`SessionManager` 管理 cookie，登录界面 UI（`LoginPanel`），地址栏登录状态显示。

| # | 功能 | 说明 | 优先级 | 状态 |
|---|------|------|--------|------|
| A-1 | 登录界面 UI | 内嵌的登录页面，支持用户名密码登录 | P0 | ✅ 已完成 |
| A-2 | 多账号管理 UI | 数据库已有 `accounts` 表，但无 UI 进行账号切换和管理。需要一个账号列表面板，支持添加/删除/切换账号 | P1 | ❌ 待实现 |
| A-3 | 登录状态指示 | 在地址栏显示当前登录用户名和状态 | P1 | ✅ 已完成 |
| A-4 | 会话自动刷新 | 配置中有 `auth.autoRefresh: true` 但未实现自动刷新逻辑。当 session 快过期时应自动刷新 | P1 | ❌ 待实现 |
| A-5 | 自动锁定 | 配置中有 `security.autoLockTimeout` 但未实现。长时间不操作后应锁定界面 | P2 | ❌ 待实现 |
| A-6 | 本地数据加密 | 配置中有 `security.encryptLocalData` 但 SQLite 数据库和 electron-store 中的数据实际上未加密 | P1 | ❌ 待实现 |

**A-2 扩展详情：**
- 在设置面板或独立面板中添加账号列表
- 支持添加新账号（弹出登录窗口）、删除已保存账号
- 支持快速切换当前激活账号，切换时更新 `SessionManager` 的 cookie
- 需要修改 `AuthManager.listCredentials()` 返回更丰富的信息

**A-4 扩展详情：**
- 在 `SessionManager` 中添加定时器检查 session 过期时间
- 距过期 5 分钟时自动调用刷新接口
- 需要配合 NodeSeek 的实际刷新 API 实现

**A-6 扩展详情：**
- 使用 `better-sqlite3` 的加密扩展或 `sqlcipher` 加密 SQLite 数据库
- 使用 `safeStorage.encryptString()` 加密 `electron-store` 中的敏感数据（WebDAV 密码等）
- 密钥可从 `keytar` 获取或使用 Electron 的 `safeStorage` API

---

### 阶段三：会话管理（Session） — 当前状态：核心功能已完成

**已完成：** `SessionManager` 支持 cookie 快照/恢复/持久化，共享标签页，标签页状态恢复。

| # | 功能 | 说明 | 优先级 | 状态 |
|---|------|------|--------|------|
| S-1 | 会话持久化到磁盘 | cookie 快照使用 electron-store 持久化 | P0 | ✅ 已完成 |
| S-2 | 标签页状态恢复 | 应用重启后恢复所有标签页 | P0 | ✅ 已完成 |
| S-3 | 浏览历史记录 | 无历史记录功能。需要记录用户浏览过的页面，支持搜索和筛选 | P1 | ❌ 待实现 |
| S-4 | 多窗口支持 | 目前仅支持单窗口 | P2 | ❌ 待实现 |

**S-3 扩展详情：**
- 在数据库中新增 `history` 表，字段：`id`, `account_id`, `url`, `title`, `visited_at`
- 在 `WebviewHost` 的 `did-navigate` 事件中记录历史
- 新增历史面板 UI（类似书签管理面板），支持按日期分组、搜索、清除
- IPC 通道：`history:list`, `history:search`, `history:clear`

---

### 阶段四：资源监控（Resource Monitor） — 当前状态：核心功能已完成

**已完成：** 定时检查总体内存/CPU，智能评分算法选择标签页挂起，防抖机制，power event 处理。

| # | 功能 | 说明 | 优先级 | 状态 |
|---|------|------|--------|------|
| R-1 | 单标签页资源追踪 | 当前仅追踪主进程总体资源。应利用 `app.getAppMetrics()` 获取每个 webview 的 CPU/内存数据 | P1 | ❌ 待实现 |
| R-2 | 资源监控面板 UI | 用户无法查看各标签页的资源使用情况 | P2 | ❌ 待实现 |
| R-3 | 资源使用告警 | 资源持续过高时应给用户通知提示 | P2 | ❌ 待实现 |
| R-4 | 可配置的挂起策略 | 当前挂起策略硬编码。应允许用户选择策略 | P2 | ❌ 待实现 |

**R-1 扩展详情：**
- 使用 `app.getAppMetrics()` 获取所有进程（包括 webview 子进程）的资源数据
- 通过 `webContents.getProcessId()` 将进程 ID 映射到具体标签页
- 在 `ResourceMonitor.collectAndAct()` 中收集每个标签页的独立资源数据
- 用于更精确的挂起决策（挂起资源消耗最大的标签页，而非仅看年龄）

---

### 阶段五：收藏系统（Bookmarks） — 当前状态：核心功能已完成

**已完成：** CRUD、文件夹层次结构、批量操作（删除/移动/收藏）、搜索、访问计数、快速收藏、WebDAV 同步、数据库列名映射。

| # | 功能 | 说明 | 优先级 | 状态 |
|---|------|------|--------|------|
| B-1 | 书签导入/导出 | 支持从浏览器 HTML 书签文件或 JSON 格式导入/导出书签 | P1 | ❌ 待实现 |
| B-2 | 书签拖拽排序 | 允许通过拖拽来调整书签顺序和移动到不同文件夹 | P1 | ❌ 待实现 |
| B-3 | 文件夹右键操作 | 在侧边栏文件夹上右键弹出菜单，支持重命名、删除、移动 | P1 | ❌ 待实现 |
| B-4 | 快速收藏当前页 | 在地址栏添加一键收藏按钮 | P0 | ✅ 已完成 |
| B-5 | 书签栏 | 在地址栏下方添加一个可选的快速访问书签栏 | P2 | ❌ 待实现 |
| B-6 | 数据库列名映射 | snake_case → camelCase 转换 | P0 | ✅ 已完成 |

**B-1 扩展详情：**
- 导出：在书签面板添加「导出」按钮，支持 JSON 和 HTML（Netscape Bookmark File Format）格式
- 导入：支持拖拽或选择文件导入，解析 HTML 书签文件（`DL` + `DT` 标签结构）
- 导入时检测重复书签（通过 URL 去重）
- IPC 通道：`bookmarks:export`, `bookmarks:import`

**B-2 扩展详情：**
- 使用 `@dnd-kit/core` 或 `react-beautiful-dnd` 实现拖拽
- 支持拖拽书签到不同文件夹
- 拖拽完成后更新数据库中的 `position` 字段
- 需要在 `BookmarkManager` 中添加 `reorderBookmarks` 方法

---

### 阶段六：WebDAV 同步 — 当前状态：书签同步已实现

**已完成：** 书签/文件夹的 WebDAV 同步、冲突检测与智能合并、增量同步（SHA-1 哈希）、重试机制。

| # | 功能 | 说明 | 优先级 | 状态 |
|---|------|------|--------|------|
| W-1 | 设置面板同步 | 除书签外，也应同步用户设置/配置 | P2 | ❌ 待实现 |
| W-2 | 同步冲突 UI | 当前冲突自动解决。应在出现冲突时提示用户选择 | P2 | ❌ 待实现 |
| W-3 | 同步日志 | 记录每次同步的详细日志，用户可查看同步历史 | P3 | ❌ 待实现 |
| W-4 | WebDAV 连通性测试 | 在设置页面提供「测试连接」按钮 | P1 | ❌ 待实现 |

**W-4 扩展详情：**
- 在 `SettingsPanel` 的 WebDAV 部分添加「测试连接」按钮
- 新增 IPC 通道 `webdav:test-connection`
- 后端尝试使用当前配置的 URL/用户名/密码创建 WebDAV 客户端并执行 `PROPFIND` 请求
- 返回连接结果（成功/失败+错误信息）显示在 UI 上

---

### UI/UX 增强

| # | 功能 | 说明 | 优先级 | 状态 |
|---|------|------|--------|------|
| U-1 | 设置面板 | 用户可修改所有配置 | P0 | ✅ 已完成 |
| U-2 | 键盘快捷键 | 基本浏览器快捷键 | P0 | ✅ 已完成 |
| U-3 | 标签页拖拽排序 | 标签页无法通过拖拽重新排列 | P1 | ❌ 待实现 |
| U-4 | 右键上下文菜单 | webview 和标签页的右键菜单 | P1 | ❌ 待实现 |
| U-5 | 通知/Toast 系统 | 统一的操作反馈通知组件 | P1 | ❌ 待实现 |
| U-6 | 深色/浅色主题切换 | 配置中有 `ui.theme` 字段，设置面板可修改，但 CSS 仍硬编码为深色 | P1 | ⚠️ 部分完成 |
| U-7 | 下载管理 | 文件下载处理 | P2 | ❌ 待实现 |
| U-8 | 缩放控制 | 页面缩放功能 | P2 | ❌ 待实现 |
| U-9 | 查找功能 | 页内文字搜索 (Ctrl/Cmd+F) | P1 | ❌ 待实现 |
| U-10 | 打印支持 | 打印功能 | P3 | ❌ 待实现 |
| U-11 | React Error Boundary | 防止白屏崩溃 | P0 | ✅ 已完成 |
| U-12 | 标签页加载状态指示 | 标签页上显示加载进度 | P1 | ❌ 待实现 |
| U-13 | 地址栏自动补全 | 历史/书签自动补全 | P2 | ❌ 待实现 |

**U-6 扩展详情（部分完成）：**
- ✅ 已完成：`SettingsPanel` 中有主题切换下拉框，`ConfigService` 可保存 `ui.theme` 字段
- ❌ 未完成：实际的 CSS 主题切换逻辑。当前所有组件的 `styled-components` 都硬编码了深色颜色值
- 需要实现：
  - 创建 `ThemeProvider` 包裹整个应用
  - 定义 light/dark 两套主题变量（背景色、文字色、边框色等）
  - 将所有硬编码的颜色值替换为主题变量
  - 在 `App.tsx` 中根据 `config.ui.theme` 切换 `ThemeProvider` 的 theme

**U-4 扩展详情：**
- 标签页右键菜单：关闭标签页、关闭其他标签页、关闭右侧标签页、复制 URL、固定标签页
- webview 右键菜单：在新标签页打开链接、复制链接、后退、前进、刷新、检查元素
- 使用 Electron 的 `Menu.buildFromTemplate()` 构建原生右键菜单
- 或使用 React 自定义右键菜单组件

**U-5 扩展详情：**
- 创建 `Toast` 或 `Notification` 组件
- 支持 success/error/warning/info 四种类型
- 自动消失（3-5秒）
- 使用 React Context 或 Zustand store 管理通知队列
- 替换所有 `setError()`、`console.error()` 调用为统一的通知 API

**U-12 扩展详情：**
- `TabMetadata` 已有 `isLoading` 字段
- 在 `TabBar` 组件中，当 `tab.isLoading` 为 true 时显示旋转图标替代 favicon
- 可使用 CSS animation 的 spinner 或 SVG 动画

---

### 平台与发布

| # | 功能 | 说明 | 优先级 | 状态 |
|---|------|------|--------|------|
| P-1 | Linux 打包目标 | `electron-builder.json` 仅配置了 macOS 和 Windows | P1 | ❌ 待实现 |
| P-2 | 自动更新 | 未集成 `electron-updater` | P2 | ❌ 待实现 |
| P-3 | 自定义协议处理 | 不支持 `nodeseek://` 自定义协议 | P3 | ❌ 待实现 |
| P-4 | 系统托盘 | 无系统托盘图标 | P2 | ❌ 待实现 |
| P-5 | 窗口状态持久化 | 窗口大小和位置不会被记住 | P1 | ❌ 待实现 |
| P-6 | 应用图标 | 未提供自定义应用图标 | P1 | ❌ 待实现 |
| P-7 | 代码签名 | macOS/Windows 代码签名流程未配置 | P2 | ❌ 待实现 |

**P-1 扩展详情：**
- 在 `config/electron-builder.json` 中添加 `linux` 配置
- 目标格式：AppImage（通用）、deb（Debian/Ubuntu）、snap（可选）
- 添加 Linux 图标（PNG 格式，多尺寸）
- 需测试在 Linux 环境下的 `keytar` 和 `sqlite3` 原生模块兼容性

**P-5 扩展详情：**
- 使用 `electron-store` 保存窗口的 `x`, `y`, `width`, `height`, `isMaximized`
- 在 `createWindow` 时读取并恢复
- 监听 `resize`, `move`, `maximize`, `unmaximize` 事件更新存储

---

### 测试与质量

| # | 功能 | 说明 | 优先级 | 状态 |
|---|------|------|--------|------|
| T-1 | 单元测试可运行性 | mock Electron 环境使测试在纯 Node.js 下运行 | P0 | ✅ 已完成 |
| T-2 | E2E 测试覆盖率 | 当前 E2E 测试非常浅。应覆盖标签页操作、导航、设置等核心流程 | P1 | ❌ 待实现 |
| T-3 | CI 流水线补充 | 缺少 lint 检查、typecheck 步骤 | P1 | ❌ 待实现 |
| T-4 | 集成测试 | 缺少 IPC 通道的集成测试 | P2 | ❌ 待实现 |

**T-3 扩展详情：**
- 新增 `.github/workflows/ci.yml`，在 PR 级别运行：
  - `npm run lint` — ESLint + Prettier 检查
  - `npx tsc --noEmit -p tsconfig.json` — TypeScript 类型检查
  - `npm run test:unit` — 单元测试
- 考虑添加 `vitest --coverage` 生成覆盖率报告

---

## 四、优先级说明

| 优先级 | 含义 | 建议时间线 |
|--------|------|-----------|
| **P0** | 核心缺失 / 阻碍正常使用 | ✅ 全部已完成 |
| **P1** | 重要功能 / 明显体验不足 | 近期 2-3 个迭代 |
| **P2** | 增强体验 / 锦上添花 | 中期规划 |
| **P3** | 远期规划 / 低频需求 | 可按需推迟 |

---

## 五、完成进度总结

### 已完成功能统计

| 类别 | 已完成 | 待实现 | 完成率 |
|------|--------|--------|--------|
| P0 优先级 | 9/9 | 0 | **100%** |
| 认证系统 | 3/6 | 3 | 50% |
| 会话管理 | 2/4 | 2 | 50% |
| 资源监控 | 0/4 | 4 | 0% |
| 收藏系统 | 2/6 | 4 | 33% |
| WebDAV 同步 | 0/4 | 4 | 0% |
| UI/UX 增强 | 4/13 | 9 | 31% |
| 平台与发布 | 0/7 | 7 | 0% |
| 测试与质量 | 1/4 | 3 | 25% |
| **总计** | **21/57** | **36** | **37%** |

### Bug 修复统计

| 批次 | 修复数量 | 高严重性 | 中严重性 | 低严重性 |
|------|---------|---------|---------|---------|
| 初始审查 | 11 | 3 | 4 | 4 |
| 本次审查 | 5 | 3 | 1 | 1 |
| **总计** | **16** | **6** | **5** | **5** |

---

## 六、建议的下一步开发路线图

```
迭代 3（体验优化）— 建议优先实施
├── 主题切换完善 (U-6) — 已有配置和 UI，仅差 CSS 主题变量
├── 通知/Toast 系统 (U-5) — 替代 console.error，提升用户体验
├── 标签页加载状态 (U-12) — 已有数据模型，仅差 UI 展示
├── 右键菜单 (U-4) — 基本浏览器功能
└── 页内搜索 (U-9) — Ctrl+F 功能

迭代 4（功能完善）
├── 书签导入/导出 (B-1)
├── 标签页/书签拖拽排序 (U-3, B-2)
├── 多账号管理 (A-2)
├── 会话自动刷新 (A-4)
├── 浏览历史 (S-3)
├── 文件夹右键操作 (B-3)
└── WebDAV 连通性测试 (W-4)

迭代 5（平台与发布）
├── Linux 打包 (P-1)
├── 窗口状态持久化 (P-5)
├── 应用图标 (P-6)
├── CI 流水线完善 (T-3)
├── E2E 测试补充 (T-2)
└── 本地数据加密 (A-6)

远期规划
├── 资源监控面板 (R-2)
├── 自定义协议 (P-3)
├── 系统托盘 (P-4)
├── 下载管理 (U-7)
├── 同步冲突 UI (W-2)
├── 自动更新 (P-2)
└── 多窗口支持 (S-4)
```

---

> 本文档由代码审查生成并持续维护，最后更新于 2026-02-15。
