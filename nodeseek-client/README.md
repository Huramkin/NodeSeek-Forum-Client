## NodeSeek DeepFlood 客戶端（階段一）

本目錄包含 Electron + React + SQLite 基礎架構，已完成以下內容：

- 多標籤頁瀏覽器外觀（新增 / 關閉 / 切換）
- React 渲染層 + `<webview>` 內嵌內容
- 主進程 `TabManager`、`ResourceMonitor`、`SessionManager`、`AuthManager` 骨架
- Electron Store 配置管理（含資源、安全與 WebDAV 設定）
- 預留 keytar / SQLite / WebDAV 依賴，確保後續功能可直接接入

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

### 下一步建議

1. **階段二**：串接真實登入流程（Keytar + SQLite 帳號表）
2. **階段三**：以 `SessionManager` 封裝 Cookie/Session CRUD 與自動刷新
3. **階段四**：在 `ResourceMonitor` 中加入 per-tab 指標並回收記憶體
4. **階段五**：完成 `BookmarkManager` + SQLite schema + UI 植入
5. **階段六**：接上 WebDAV 同步與衝突處理策略
