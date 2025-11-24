# NodeSeek DeepFlood Forum Client

此倉庫包含使用 Electron + React 打造的 NodeSeek DeepFlood 桌面端應用程式。  
目前已完成「階段一：基礎架構」，核心內容位於 `nodeseek-client/` 目錄。

## 快速開始

```bash
cd nodeseek-client
npm install
npm run dev
```

預設會啟動 Vite Renderer、主進程與 Electron 殼，同時載入一個指向 NodeSeek 的預設標籤頁。

## 開發階段總覽

1. **階段一：基礎架構** – Electron + React 框架、多標籤頁 UI、配置系統
2. 階段二：認證系統
3. 階段三：會話管理
4. 階段四：資源監控
5. 階段五：收藏系統
6. 階段六：WebDAV 同步
7. 階段七：測試與優化

> 後續階段將在既有架構上逐步擴展，確保跨平台（Windows/macOS）支援與安全性。
