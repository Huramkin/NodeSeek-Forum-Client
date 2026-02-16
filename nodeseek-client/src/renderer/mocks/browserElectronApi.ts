import { defaultConfig } from '@shared/config/defaults';
import { TabSnapshot } from '@shared/types/tabs';
import { BookmarkRecord, BookmarkFolder } from '@shared/types/bookmarks';
import type { ElectronApi } from '../../preload';

const createMockSnapshot = (): TabSnapshot => ({
  activeTabId: 'demo-1',
  tabs: [
    {
      id: 'demo-1',
      title: 'NodeSeek',
      url: 'https://nodeseek.com/',
      favicon: undefined,
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
    visitCount: 0,
    lastVisited: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const attachBrowserElectronApi = (): void => {
  if ((window as any).electronAPI) {
    return;
  }

  let snapshot = createMockSnapshot();
  let bookmarks = createMockBookmarks();
  let folders: BookmarkFolder[] = [];
  let nextFolderId = 1;

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
          folderId: payload.folderId,
          isFavorite: payload.isFavorite,
          visitCount: 0,
          lastVisited: null,
          createdAt: now,
          updatedAt: now
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
                updatedAt: new Date().toISOString()
              }
            : bookmark
        );
      },
      remove: async (id) => {
        bookmarks = bookmarks.filter((bookmark) => bookmark.id !== id);
      },
      search: async ({ keyword }) =>
        bookmarks.filter(
          (bookmark) =>
            bookmark.title.includes(keyword) ||
            bookmark.url.includes(keyword) ||
            (bookmark.tags ?? '').includes(keyword)
        ),
      sync: async () => ({
        lastSync: new Date().toISOString(),
        syncHash: Math.random().toString(36).slice(2),
        source: 'local' as const
      }),
      incrementVisit: async (id) => {
        bookmarks = bookmarks.map((bookmark) =>
          bookmark.id === id
            ? { ...bookmark, visitCount: (bookmark.visitCount ?? 0) + 1, lastVisited: new Date().toISOString() }
            : bookmark
        );
      },
      batch: async ({ ids, operation, folderId }) => {
        switch (operation) {
          case 'delete':
            bookmarks = bookmarks.filter((b) => !ids.includes(b.id));
            break;
          case 'move':
            bookmarks = bookmarks.map((b) => (ids.includes(b.id) ? { ...b, folderId } : b));
            break;
          case 'favorite':
            bookmarks = bookmarks.map((b) => (ids.includes(b.id) ? { ...b, isFavorite: true } : b));
            break;
          case 'unfavorite':
            bookmarks = bookmarks.map((b) => (ids.includes(b.id) ? { ...b, isFavorite: false } : b));
            break;
        }
      }
    },
    folders: {
      list: async () => folders,
      create: async (payload) => {
        const id = nextFolderId++;
        folders.push({
          id,
          accountId: payload.accountId,
          name: payload.name,
          parentId: payload.parentId ?? null,
          position: payload.position ?? 0,
          createdAt: new Date().toISOString()
        });
        return id;
      },
      update: async ({ id, data }) => {
        folders = folders.map((f) => (f.id === id ? { ...f, ...data } : f));
      },
      remove: async (id, moveToFolder) => {
        bookmarks = bookmarks.map((b) =>
          b.folderId === id ? { ...b, folderId: moveToFolder ?? undefined } : b
        );
        folders = folders.filter((f) => f.id !== id);
      }
    },
    auth: {
      login: async (_username, _password) => ({ success: true, accountId: 'mock-1', username: _username }),
      logout: async () => ({ success: true }),
      getCurrentUser: async () => null,
      listAccounts: async () => []
    }
  };

  (window as any).electronAPI = electronApi;
};
