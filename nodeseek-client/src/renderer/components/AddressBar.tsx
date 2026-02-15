import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTabStore } from '../store/tabStore';
import { normalizeAddress } from '../utils/url';
import type { BookmarkRecord } from '@shared/types/bookmarks';

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(18, 20, 30, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`;

const Button = styled.button<{ $active?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: ${({ $active }) => ($active ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.08)')};
  color: ${({ $active }) => ($active ? '#ffd700' : '#f8fafc')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active }) => ($active ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.16)')};
  }
`;

const Input = styled.input`
  flex: 1;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
`;

interface AddressBarProps {
  onOpenBookmarks: () => void;
  onOpenSettings: () => void;
}

export const AddressBar = ({ onOpenBookmarks, onOpenSettings }: AddressBarProps) => {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [tabs, activeTabId]);
  const [address, setAddress] = useState(activeTab?.url ?? '');
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentBookmarkId, setCurrentBookmarkId] = useState<number | null>(null);

  useEffect(() => {
    setAddress(activeTab?.url ?? '');
  }, [activeTab?.url]);

  // Load bookmarks on mount
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

  // Check if current URL is bookmarked
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
    if (!activeTab) {
      return;
    }
    const normalized = normalizeAddress(address);
    setAddress(normalized);
    void window.electronAPI.tabs.navigate({ id: activeTab.id, url: normalized });
  };

  const handleReload = () => {
    if (!activeTab) {
      return;
    }
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
        // Remove bookmark
        await window.electronAPI.bookmarks.remove(currentBookmarkId);
        setBookmarks((prev) => prev.filter((b) => b.id !== currentBookmarkId));
        setIsBookmarked(false);
        setCurrentBookmarkId(null);
      } else {
        // Add bookmark
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
    <Container>
      <Button onClick={handleBack} title="返回">
        ←
      </Button>
      <Button onClick={handleForward} title="前進">
        →
      </Button>
      <Button onClick={handleReload} title="重新整理">
        ⟳
      </Button>
      <Button onClick={handleForceUnload} title="強制卸載標籤頁內容">
        ⏻
      </Button>
      <Button $active={isBookmarked} onClick={handleToggleBookmark} title={isBookmarked ? '取消收藏' : '收藏當前頁面'}>
        {isBookmarked ? '★' : '☆'}
      </Button>
      <Button onClick={onOpenBookmarks} title="管理書籤">
        ☰
      </Button>
      <Button onClick={onOpenSettings} title="設定">
        ⚙
      </Button>
      <form style={{ flex: 1 }} onSubmit={handleSubmit}>
        <Input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          spellCheck={false}
          placeholder="輸入 NodeSeek 帖子連結或關鍵字"
        />
      </form>
    </Container>
  );
};
