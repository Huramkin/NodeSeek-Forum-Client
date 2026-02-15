import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannels } from '@shared/ipcChannels';
import {
  CreateTabPayload,
  NavigateTabPayload,
  ReloadTabPayload,
  TabSnapshot,
  UpdateTabMetaPayload
} from '@shared/types/tabs';
import { AppConfig } from '@shared/types/config';
import {
  BookmarkInput,
  BookmarkRecord,
  BookmarkSearchPayload,
  BookmarkSyncResult,
  BookmarkUpdatePayload,
  BookmarkFolder,
  BookmarkFolderInput,
  BookmarkFolderUpdatePayload,
  BatchBookmarkOperation
} from '@shared/types/bookmarks';

const tabsApi = {
  list: (): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_LIST),
  create: (payload?: CreateTabPayload): Promise<TabSnapshot> =>
    ipcRenderer.invoke(IPCChannels.TABS_CREATE, payload),
  close: (id: string): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_CLOSE, id),
  activate: (id: string): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_ACTIVATE, id),
  navigate: (payload: NavigateTabPayload): Promise<TabSnapshot> =>
    ipcRenderer.invoke(IPCChannels.TABS_NAVIGATE, payload),
  updateMeta: (payload: UpdateTabMetaPayload): Promise<TabSnapshot> =>
    ipcRenderer.invoke(IPCChannels.TABS_UPDATE_META, payload),
  refresh: (payload: ReloadTabPayload): Promise<TabSnapshot> =>
    ipcRenderer.invoke(IPCChannels.TABS_REFRESH, payload),
  onState: (listener: (snapshot: TabSnapshot) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, snapshot: TabSnapshot) => listener(snapshot);
    ipcRenderer.on(IPCChannels.TABS_STATE_PUSH, handler);
    return () => ipcRenderer.removeListener(IPCChannels.TABS_STATE_PUSH, handler);
  },
  onReload: (listener: (payload: ReloadTabPayload) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: ReloadTabPayload) => listener(payload);
    ipcRenderer.on(IPCChannels.TABS_RELOAD, handler);
    return () => ipcRenderer.removeListener(IPCChannels.TABS_RELOAD, handler);
  },
  onForceUnload: (listener: (id: string) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: { id: string }) => listener(payload.id);
    ipcRenderer.on(IPCChannels.TABS_FORCE_UNLOAD, handler);
    return () => ipcRenderer.removeListener(IPCChannels.TABS_FORCE_UNLOAD, handler);
  }
};

const configApi = {
  get: (): Promise<AppConfig> => ipcRenderer.invoke(IPCChannels.CONFIG_GET),
  update: (partial: Partial<AppConfig>): Promise<AppConfig> =>
    ipcRenderer.invoke(IPCChannels.CONFIG_UPDATE, partial)
};

const bookmarksApi = {
  list: (accountId: number): Promise<BookmarkRecord[]> =>
    ipcRenderer.invoke(IPCChannels.BOOKMARK_LIST, accountId),
  add: (payload: BookmarkInput): Promise<number> => ipcRenderer.invoke(IPCChannels.BOOKMARK_ADD, payload),
  update: (payload: BookmarkUpdatePayload): Promise<void> =>
    ipcRenderer.invoke(IPCChannels.BOOKMARK_UPDATE, payload),
  remove: (id: number): Promise<void> => ipcRenderer.invoke(IPCChannels.BOOKMARK_DELETE, id),
  search: (payload: BookmarkSearchPayload): Promise<BookmarkRecord[]> =>
    ipcRenderer.invoke(IPCChannels.BOOKMARK_SEARCH, payload),
  sync: (): Promise<BookmarkSyncResult | null> => ipcRenderer.invoke(IPCChannels.BOOKMARK_SYNC),
  incrementVisit: (id: number): Promise<void> => ipcRenderer.invoke(IPCChannels.BOOKMARK_INCREMENT_VISIT, id),
  batch: (payload: BatchBookmarkOperation): Promise<void> =>
    ipcRenderer.invoke(IPCChannels.BOOKMARK_BATCH, payload)
};

const foldersApi = {
  list: (accountId: number): Promise<BookmarkFolder[]> =>
    ipcRenderer.invoke(IPCChannels.FOLDER_LIST, accountId),
  create: (payload: BookmarkFolderInput): Promise<number> =>
    ipcRenderer.invoke(IPCChannels.FOLDER_CREATE, payload),
  update: (payload: BookmarkFolderUpdatePayload): Promise<void> =>
    ipcRenderer.invoke(IPCChannels.FOLDER_UPDATE, payload),
  remove: (id: number, moveToFolder?: number): Promise<void> =>
    ipcRenderer.invoke(IPCChannels.FOLDER_DELETE, id, moveToFolder)
};

interface LoginResult {
  success: boolean;
  accountId: string;
  username: string;
}

interface Account {
  id: string;
  username: string;
  displayName?: string;
}

const authApi = {
  login: (username: string, password: string): Promise<LoginResult> =>
    ipcRenderer.invoke(IPCChannels.AUTH_LOGIN, username, password),
  logout: (accountId: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke(IPCChannels.AUTH_LOGOUT, accountId),
  getCurrentUser: (): Promise<Account | null> => ipcRenderer.invoke(IPCChannels.AUTH_GET_CURRENT),
  listAccounts: (): Promise<Account[]> => ipcRenderer.invoke(IPCChannels.AUTH_LIST_ACCOUNTS)
};

const electronAPI = {
  tabs: tabsApi,
  config: configApi,
  bookmarks: bookmarksApi,
  folders: foldersApi,
  auth: authApi
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronApi = typeof electronAPI;
