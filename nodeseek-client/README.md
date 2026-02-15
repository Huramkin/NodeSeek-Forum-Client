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
| 階段二 | 認證系統：`AuthManager` + keytar、登入 UI、登入狀態指示               | ✅ 已完成（多帳號 UI、自動刷新待實現） |
| 階段三 | 會話管理：`SessionManager` 快照/還原/持久化、標籤頁狀態恢復          | ✅ 已完成（瀏覽歷史待實現）           |
| 階段四 | 資源管理：`ResourceMonitor` 監控 RSS/CPU，智能掛起演算法             | ✅ 已完成（單標籤頁追蹤待實現）       |
| 階段五 | 收藏系統：CRUD + 資料夾 + 批次操作 + 快速收藏 + DB 列名映射         | ✅ 核心完成（導入/導出、拖拽排序待實現）|
| 階段六 | WebDAV 雲同步：衝突檢測 + 智能合併 + SHA-1 增量同步 + 重試機制      | ✅ 核心完成（連通性測試、衝突 UI 待實現）|
| 階段七 | 測試與體驗優化：35 個單元測試通過 + Error Boundary + 設定面板 + 快捷鍵 | ✅ 核心完成（E2E 擴充、CI 流水線待實現）|

> **所有 P0 優先級功能（9 項）均已完成實現。** 詳見 [`docs/TODO.md`](docs/TODO.md)。

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

### 後續方向

1. **體驗優化**：主題切換完善 (U-6)、通知系統 (U-5)、右鍵選單 (U-4)、頁內搜尋 (U-9)
2. **功能完善**：書籤導入/導出 (B-1)、拖拽排序 (U-3/B-2)、多帳號管理 (A-2)、瀏覽歷史 (S-3)
3. **平台與發布**：Linux 打包 (P-1)、視窗狀態持久化 (P-5)、CI 流水線 (T-3)
4. **遠期規劃**：資源監控面板、系統託盤、下載管理、自動更新

> 完整的待擴展功能清單及詳細實施建議請參考 [`docs/TODO.md`](docs/TODO.md)。
