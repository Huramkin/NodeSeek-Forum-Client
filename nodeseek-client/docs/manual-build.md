# 手動編譯與打包指南

本文說明如何在不同平台上自行建置 NodeSeek DeepFlood 安裝包，並於完成後上傳釋出。

## 1. 環境需求

- Node.js 20 以上、npm 10 以上
- Git
- 作業系統相依套件：
  - **macOS**：Xcode Command Line Tools、`brew install python`（供 `node-gyp` 使用）
  - **Windows**：Visual Studio Build Tools（含 Desktop development with C++）、PowerShell
  - **Linux**：`sudo apt-get install build-essential python3 libsqlite3-dev`

建議先清空舊版依賴：

```bash
rm -rf node_modules dist release
```

## 2. 安裝依賴

```bash
npm install
```

首次在 Linux/macOS 操作時，可另外執行：

```bash
npm run postinstall
```

## 3. 編譯流程

1. **型別檢查 / Lint**
   ```bash
   npm run typecheck
   npm run lint
   ```
2. **單元與 E2E 測試**
   ```bash
   npm run test
   # 若僅驗證單元測試
   npm run test:unit
   ```
3. **正式建置**
   ```bash
   npm run build
   ```
4. **打包安裝檔**
   ```bash
   npm run package
   ```

完成後，產物位於 `release/` 目錄，依平台產生 `.dmg`、`.zip`、`.exe`、`.nsis` 等檔案。

## 4. 上傳 GitHub Releases

若要手動上傳，可在 GitHub 建立新的 Release，然後將 `release/` 下的檔案拖曳進附件區。若使用此專案隨附的 GitHub Action，只要建立 `v*` 標籤並發布 Release，CI 即會自動完成以下動作：

1. 針對 macOS / Windows / Linux 分別執行 `npm run package`
2. 以 `softprops/action-gh-release` 將各平台產物附加至該 Release

> 注意：macOS 打包需要 Apple 開發者簽章才能解除 Gatekeeper，開發測試階段可使用未簽章的 `dmg/zip`，但發行正式版需自行處理簽章及公證。

## 5. 常見問題

- **node-gyp 編譯失敗**：確認 Python 版本為 3.x，並確保系統已有 C/C++ Build Tools。
- **sqlite3 無法安裝**：在 Linux 安裝 `libsqlite3-dev`，Windows 需於 VS Installer 勾選「適用於 Windows 的 C++ 工作負載」。
- **WebDAV 同步失敗**：請於設定頁更新 `webdav.url/username/password`，或檢查遠端伺服器權限。
