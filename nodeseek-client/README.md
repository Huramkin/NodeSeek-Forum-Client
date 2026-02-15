## NodeSeek DeepFlood 客戶端（階段一～四）

本目錄包含 Electron + React + SQLite 基礎架構，並完成前四階段需求：

- 多標籤頁瀏覽器外觀（新增 / 關閉 / 切換）
- React 渲染層 + `<webview>` 內嵌內容
- 主進程 `TabManager`、`ResourceMonitor`、`SessionManager`、`AuthManager` 與 `BookmarkManager`
- Electron Store 配置管理（含資源、安全與 WebDAV 設定），支援書籤同步
- WebDAV、自動會話快照、keytar 憑證儲存、SQLite 收藏系統

### 階段進度總結

| 階段   | 內容                                                                 | 目前狀態                              |
| ------ | -------------------------------------------------------------------- | ------------------------------------- |
| 階段一 | 多標籤頁基礎、React/Electron 架構                                    | ✅ 已完成                             |
| 階段二 | 認證系統：`AuthManager` + keytar、帳號管理接口                       | ✅ 已完成                             |
| 階段三 | 會話管理：`SessionManager` 快照/還原、跨標籤共享、IPC `tabs:refresh` | ✅ 已完成                             |
| 階段四 | 資源管理：`ResourceMonitor` 監控 RSS/CPU，自動卸載與恢復流程         | ✅ 已完成                             |
| 階段五 | 收藏系統（更完整分類與 UI 強化）                                     | ⏳ 進行中（目前提供 CRUD + 搜尋）     |
| 階段六 | WebDAV 雲同步與衝突處理                                              | ⏳ 已接入 WebDAV，後續加強衝突策略    |
| 階段七 | 測試與體驗優化                                                       | ⏳ 具備 Vitest / Playwright 與 ESLint |

### 安裝

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

- `vite dev`：啟動 React 渲染層
- `tsc -w`：監聽並編譯主進程 / preload
- `electron .`：載入最新建置成果並注入 webview

### 打包

```bash
npm run package
```

基於 `config/electron-builder.json`，可輸出 Windows（NSIS/ZIP）與 macOS（DMG/ZIP）安裝包。

> 進階簽章、平台差異化依賴請參考 [`docs/manual-build.md`](docs/manual-build.md)。

### 測試與靜態檢查

```bash
npm run lint        # ESLint + Prettier 規則
npm run test:unit   # Vitest
npm run test:e2e    # Playwright（使用 Vite preview 與瀏覽器 mock）
```

### 主要目錄

```
src/
  main/        # 主進程與服務
  preload/     # contextBridge 暴露 API
  renderer/    # React UI（TabBar / AddressBar / WebviewHost）
  shared/      # 共享型別、設定與 IPC 管道
config/        # electron-builder 與安全設定
assets/        # 靜態資產
database/      # SQLite 文件與遷移（後續階段）
```

### 安全與會話

- `AuthManager` 整合 keytar，憑證預設加密儲存
- `SessionManager` 控制 Cookie 複製、清除、跨標籤共用
- 預設啟用 `contextIsolation`、停用 `nodeIntegration`，僅透過 `preload` 暴露受控 API
- `<webview>` 使用 `partition="persist:nodeseek"`，為之後的多帳號機制留有擴充空間

### 後續方向（階段五～七）

1. **階段五**：深化 `BookmarkManager` UI（群組、批次標籤）與帳號關聯
2. **階段六**：完善 WebDAV 衝突解決策略、增量同步、重試機制
3. **階段七**：擴充自動化測試、模擬真實登入流程並進行 UX / 安全性調整
