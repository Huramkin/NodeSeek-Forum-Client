# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NodeSeek DeepFlood Forum Client — an Electron + React desktop browser client for the NodeSeek forum. All source code lives under `nodeseek-client/`. The root directory is a wrapper; always `cd nodeseek-client` before running any commands.

## Commands

All commands must be run from `nodeseek-client/`:

```bash
npm install              # Install dependencies (runs electron-builder install-app-deps via postinstall)
npm run dev              # Start dev mode (Vite renderer + tsc watchers + Electron, uses port 5173)
npm run build            # Build main + preload + renderer
npm run package          # Build + electron-builder (Windows NSIS/ZIP, macOS DMG/ZIP)
npm run lint             # ESLint on src/**/*.{ts,tsx}
npm run format           # Prettier --write
npm run typecheck        # tsc --noEmit
npm run test:unit        # Vitest (unit tests)
npm run test:e2e         # Playwright (E2E tests)
npx vitest run src/main/services/__tests__/configService.test.ts  # Run a single test file
```

## Architecture

**Multi-process Electron app** with strict context isolation:

- **`src/main/`** — Main process: app lifecycle, IPC handlers, service classes (`TabManager`, `BookmarkManager`, `ResourceMonitor`, `SessionManager`, `AuthManager`, `ConfigService`)
- **`src/preload/`** — Context bridge: exposes `window.electronApi` to renderer via `contextBridge.exposeInMainWorld`
- **`src/renderer/`** — React UI: components (`TabBar`, `AddressBar`, `WebviewHost`, `LoginPanel`, `SettingsPanel`, `BookmarkManagerPanel`), Zustand store (`tabStore.ts`), hooks, pages (`App.tsx`)
- **`src/shared/`** — Shared types, config defaults, and IPC channel constants (`ipcChannels.ts`)

**IPC pattern:** Channels are defined as string constants in `src/shared/ipcChannels.ts`. Main process registers handlers via `ipcMain.handle()`. Renderer calls them through `window.electronApi.invoke()` exposed by the preload script.

**State management:** Zustand for renderer-side UI state; Electron Store for persistent config; SQLite for bookmarks/folders/accounts.

**Database:** SQLite with `mapDbRowToObject()` converting snake_case DB columns to camelCase JS objects. Tables: `accounts`, `bookmarks`, `bookmark_folders`, `sync_status`.

**Security:** `contextIsolation: true`, `nodeIntegration: false`, credentials via keytar (system keychain), webview uses `partition="persist:nodeseek"`.

## Tech Stack

- Electron 31, React 18, TypeScript 5.6, Vite 5
- Zustand (state), Styled Components (styling), SQLite3 (database), Keytar (credentials), WebDAV (cloud sync)
- ESLint 9 (flat config), Prettier, Vitest, Playwright
- Node >= 20 required

## Key Conventions

- Three separate `tsconfig` files: `tsconfig.main.json` (main process), `tsconfig.preload.json` (preload), `tsconfig.json` (renderer/shared/tests)
- Vite path aliases: `@renderer` → `src/renderer`, `@shared` → `src/shared`
- Unit test setup file: `src/main/services/__tests__/setup.ts` (mocks Electron APIs, keytar, electron-store)
- Documentation is in Chinese (Traditional)
- Config for electron-builder is at `config/electron-builder.json`

## Known Pitfalls

- **`styled.webview` is not a function**: `<webview>` is an Electron-specific tag not in styled-components' built-in list. Use plain `<webview>` with inline `style` instead of `styled('webview')` — the latter injects a `class` attribute which triggers React's `Invalid DOM property class` warning on custom elements.
- **Zustand selector infinite loop**: Never return a new object from a Zustand selector (e.g. `useTabStore((s) => ({ a: s.a, b: s.b }))`). Zustand uses `Object.is` by default, so a fresh object triggers re-render → infinite loop. Use separate `useTabStore((s) => s.a)` calls for each field instead.
- **`window.electronAPI` unavailable in browser**: The preload script only runs inside Electron. When the Vite dev server is opened directly in a browser, `window.electronAPI` is undefined. The mock at `src/renderer/mocks/browserElectronApi.ts` fills this gap — keep it in sync with the real API in `src/preload/index.ts` (e.g. the `auth` namespace was previously missing from the mock).
- **IPC handler registration must happen before `loadURL`**: In `main.ts`, `registerIpcHandlers()` must be called before `mainWindow.loadURL()`. Otherwise the renderer calls `tabs.list()` on mount before handlers exist, causing the initial snapshot to fail and the app to show a black screen with no tabs.
- **Favicon fallback must use local/data URI**: Do not use a remote URL (e.g. `https://nodeseek.com/favicon.ico`) as the default favicon — the server may return 500/403. Use an inline data URI instead. Also, `<img onError>` handlers that set `src` to a fallback must guard against the fallback itself failing, otherwise it creates an infinite error loop. Always check `if (event.currentTarget.src !== FALLBACK)` before reassigning.
