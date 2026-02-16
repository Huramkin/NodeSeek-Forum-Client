import { useEffect, useMemo, useState } from 'react';
import { useTabStore } from '../store/tabStore';
import { normalizeAddress } from '../utils/url';
import { cn } from '../lib/utils';
import type { BookmarkRecord } from '@shared/types/bookmarks';

interface AddressBarProps {
  onOpenBookmarks: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
  currentUser: { username: string; displayName?: string } | null;
  onLogout: () => void;
}

const NavButton = ({
  onClick,
  title,
  active,
  children
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      'w-8 h-8 rounded-md border-none cursor-pointer flex items-center justify-center text-sm transition-all',
      active
        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
        : 'bg-white/[0.08] text-text-primary hover:bg-white/[0.16]'
    )}
  >
    {children}
  </button>
);

export const AddressBar = ({ onOpenBookmarks, onOpenSettings, onOpenLogin, currentUser, onLogout }: AddressBarProps) => {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [tabs, activeTabId]);
  const [address, setAddress] = useState(activeTab?.url ?? '');
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentBookmarkId, setCurrentBookmarkId] = useState<number | null>(null);

  useEffect(() => {
    setAddress(activeTab?.url ?? '');
  }, [activeTab?.url]);

  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const allBookmarks = await window.electronAPI.bookmarks.list(1);
        setBookmarks(allBookmarks);
      } catch (error) {
        console.error('[AddressBar] Failed to load bookmarks:', error);
      }
    };
    void loadBookmarks();
  }, []);

  useEffect(() => {
    if (!activeTab?.url) {
      setIsBookmarked(false);
      setCurrentBookmarkId(null);
      return;
    }
    const bookmark = bookmarks.find((b) => b.url === activeTab.url);
    setIsBookmarked(!!bookmark);
    setCurrentBookmarkId(bookmark?.id ?? null);
  }, [activeTab?.url, bookmarks]);

  const activeWebview = (): HTMLWebViewElement | null => {
    if (!activeTabId) return null;
    return document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeTab) return;
    const normalized = normalizeAddress(address);
    setAddress(normalized);
    void window.electronAPI.tabs.navigate({ id: activeTab.id, url: normalized });
  };

  const handleReload = () => {
    if (!activeTab) return;
    void window.electronAPI.tabs.refresh({
      id: activeTab.id,
      url: activeTab.url,
      mode: 'hard',
      reason: 'user'
    });
  };

  const handleForceUnload = () => {
    const view = activeWebview();
    if (view) {
      view.src = 'about:blank';
    }
  };

  const handleBack = () => {
    const view = activeWebview();
    if (view?.canGoBack()) {
      view.goBack();
    }
  };

  const handleForward = () => {
    const view = activeWebview();
    if (view?.canGoForward()) {
      view.goForward();
    }
  };

  const handleToggleBookmark = async () => {
    if (!activeTab) return;

    try {
      if (isBookmarked && currentBookmarkId) {
        await window.electronAPI.bookmarks.remove(currentBookmarkId);
        setBookmarks((prev) => prev.filter((b) => b.id !== currentBookmarkId));
        setIsBookmarked(false);
        setCurrentBookmarkId(null);
      } else {
        const title = activeTab.title || activeTab.url;
        const newId = await window.electronAPI.bookmarks.add({
          accountId: 1,
          title,
          url: activeTab.url,
          isFavorite: false
        });

        const newBookmark: BookmarkRecord = {
          id: newId,
          accountId: 1,
          title,
          url: activeTab.url,
          isFavorite: false,
          visitCount: 0,
          lastVisited: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setBookmarks((prev) => [...prev, newBookmark]);
        setIsBookmarked(true);
        setCurrentBookmarkId(newId);
      }
    } catch (error) {
      console.error('[AddressBar] Failed to toggle bookmark:', error);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-surface-elevated/95 border-b border-border-subtle">
      <NavButton onClick={handleBack} title="返回">←</NavButton>
      <NavButton onClick={handleForward} title="前進">→</NavButton>
      <NavButton onClick={handleReload} title="重新整理">⟳</NavButton>
      <NavButton onClick={handleForceUnload} title="強制卸載標籤頁內容">⏻</NavButton>
      <NavButton onClick={handleToggleBookmark} title={isBookmarked ? '取消收藏' : '收藏當前頁面'} active={isBookmarked}>
        {isBookmarked ? '★' : '☆'}
      </NavButton>
      <NavButton onClick={onOpenBookmarks} title="管理書籤">☰</NavButton>
      <NavButton onClick={onOpenSettings} title="設定">⚙</NavButton>
      {currentUser ? (
        <>
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-[13px] text-blue-400">
            <span>👤</span>
            <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap" title={currentUser.displayName || currentUser.username}>
              {currentUser.displayName || currentUser.username}
            </span>
          </div>
          <NavButton onClick={onLogout} title="登出">⎋</NavButton>
        </>
      ) : (
        <NavButton onClick={onOpenLogin} title="登入">🔑</NavButton>
      )}
      <form className="flex-1" onSubmit={handleSubmit}>
        <input
          className="w-full h-9 rounded-lg border-none bg-white/[0.08] text-[#e2e8f0] px-3 text-sm outline-none"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          spellCheck={false}
          placeholder="輸入 NodeSeek 帖子連結或關鍵字"
        />
      </form>
    </div>
  );
};
