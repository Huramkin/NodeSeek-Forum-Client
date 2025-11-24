import { defaultConfig } from '@shared/config/defaults';
import { TabSnapshot } from '@shared/types/tabs';
import { BookmarkRecord } from '@shared/types/bookmarks';
import type { ElectronApi } from '../../preload';

const createMockSnapshot = (): TabSnapshot => ({
  activeTabId: 'demo-1',
  tabs: [
    {
      id: 'demo-1',
      title: 'NodeSeek',
      url: 'https://nodeseek.com/',
      favicon: 'https://nodeseek.com/favicon.ico',
      isActive: true,
      isSuspended: false,
      isLoading: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ]
});

const createMockBookmarks = (): BookmarkRecord[] => [
  {
    id: 1,
    accountId: 1,
    title: 'NodeSeek',
    url: 'https://nodeseek.com/',
    category: '論壇',
    tags: '社群,技術',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const attachBrowserElectronApi = (): void => {
  if ((window as any).electronAPI) {
    return;
  }

  let snapshot = createMockSnapshot();
  let bookmarks = createMockBookmarks();

  const electronApi: ElectronApi = {
    tabs: {
      list: async () => snapshot,
      create: async () => snapshot,
      close: async () => snapshot,
      activate: async () => snapshot,
      navigate: async () => snapshot,
      updateMeta: async () => snapshot,
      refresh: async () => snapshot,
      onState: (listener) => {
        listener(snapshot);
        return () => {};
      },
      onReload: () => () => {},
      onForceUnload: () => () => {}
    },
    config: {
      get: async () => defaultConfig,
      update: async () => defaultConfig
    },
    bookmarks: {
      list: async () => bookmarks,
      add: async (payload) => {
        const now = new Date().toISOString();
        const record: BookmarkRecord = {
          id: Date.now(),
          accountId: payload.accountId,
          title: payload.title,
          url: payload.url,
          category: payload.category,
          tags: payload.tags,
          created_at: now,
          updated_at: now
        };
        bookmarks = [record, ...bookmarks];
        return record.id;
      },
      update: async ({ id, data }) => {
        bookmarks = bookmarks.map((bookmark) =>
          bookmark.id === id
            ? {
                ...bookmark,
                ...data,
                updated_at: new Date().toISOString()
              }
            : bookmark
        );
      },
      remove: async (id) => {
        bookmarks = bookmarks.filter((bookmark) => bookmark.id !== id);
      },
      search: async ({ keyword }) => bookmarks.filter((bookmark) => bookmark.title.includes(keyword) || bookmark.url.includes(keyword) || (bookmark.tags ?? '').includes(keyword)),
      sync: async () => ({
        lastSync: new Date().toISOString(),
        syncHash: Math.random().toString(36).slice(2),
        source: 'local' as const
      })
    }
  };

  (window as any).electronAPI = electronApi;
};
