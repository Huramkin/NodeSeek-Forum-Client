import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannels } from '@shared/ipcChannels';
import { CreateTabPayload, NavigateTabPayload, ReloadTabPayload, TabSnapshot, UpdateTabMetaPayload } from '@shared/types/tabs';
import { AppConfig } from '@shared/types/config';
import { BookmarkInput, BookmarkRecord, BookmarkSearchPayload, BookmarkSyncResult, BookmarkUpdatePayload } from '@shared/types/bookmarks';

const tabsApi = {
  list: (): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_LIST),
  create: (payload?: CreateTabPayload): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_CREATE, payload),
  close: (id: string): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_CLOSE, id),
  activate: (id: string): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_ACTIVATE, id),
  navigate: (payload: NavigateTabPayload): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_NAVIGATE, payload),
  updateMeta: (payload: UpdateTabMetaPayload): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_UPDATE_META, payload),
  refresh: (payload: ReloadTabPayload): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_REFRESH, payload),
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
  update: (partial: Partial<AppConfig>): Promise<AppConfig> => ipcRenderer.invoke(IPCChannels.CONFIG_UPDATE, partial)
};

const bookmarksApi = {
  list: (accountId: number): Promise<BookmarkRecord[]> => ipcRenderer.invoke(IPCChannels.BOOKMARK_LIST, accountId),
  add: (payload: BookmarkInput): Promise<number> => ipcRenderer.invoke(IPCChannels.BOOKMARK_ADD, payload),
  update: (payload: BookmarkUpdatePayload): Promise<void> => ipcRenderer.invoke(IPCChannels.BOOKMARK_UPDATE, payload),
  remove: (id: number): Promise<void> => ipcRenderer.invoke(IPCChannels.BOOKMARK_DELETE, id),
  search: (payload: BookmarkSearchPayload): Promise<BookmarkRecord[]> => ipcRenderer.invoke(IPCChannels.BOOKMARK_SEARCH, payload),
  sync: (): Promise<BookmarkSyncResult | null> => ipcRenderer.invoke(IPCChannels.BOOKMARK_SYNC)
};

contextBridge.exposeInMainWorld('electronAPI', {
  tabs: tabsApi,
  config: configApi,
  bookmarks: bookmarksApi
});

export type ElectronApi = typeof window.electronAPI;
