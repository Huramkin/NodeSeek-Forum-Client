import { useEffect } from 'react';
import { useTabStore } from '../store/tabStore';

/**
 * Custom hook to handle keyboard shortcuts
 * 
 * Supported shortcuts:
 * - Ctrl/Cmd+T: New tab
 * - Ctrl/Cmd+W: Close current tab
 * - Ctrl/Cmd+R: Reload current tab
 * - Ctrl/Cmd+L: Focus address bar
 * - Ctrl/Cmd+1-9: Switch to specific tab
 * - Ctrl/Cmd+Tab: Next tab
 * - Ctrl/Cmd+Shift+Tab: Previous tab
 * - Ctrl/Cmd+Shift+T: Reopen closed tab (TODO)
 * - Ctrl/Cmd+F: Find in page (TODO)
 */
export const useKeyboardShortcuts = () => {
  const { tabs, activeTabId } = useTabStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd+T: New tab
      if (ctrlOrCmd && event.key === 't') {
        event.preventDefault();
        void window.electronAPI.tabs.create();
        return;
      }

      // Ctrl/Cmd+W: Close current tab
      if (ctrlOrCmd && event.key === 'w') {
        event.preventDefault();
        if (activeTabId) {
          void window.electronAPI.tabs.close(activeTabId);
        }
        return;
      }

      // Ctrl/Cmd+R: Reload current tab
      if (ctrlOrCmd && event.key === 'r') {
        event.preventDefault();
        const activeTab = tabs.find((tab) => tab.id === activeTabId);
        if (activeTab) {
          void window.electronAPI.tabs.refresh({
            id: activeTab.id,
            url: activeTab.url,
            mode: 'hard',
            reason: 'user'
          });
        }
        return;
      }

      // Ctrl/Cmd+L: Focus address bar
      if (ctrlOrCmd && event.key === 'l') {
        event.preventDefault();
        const addressBar = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (addressBar) {
          addressBar.focus();
          addressBar.select();
        }
        return;
      }

      // Ctrl/Cmd+1-9: Switch to specific tab
      if (ctrlOrCmd && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const tabIndex = parseInt(event.key, 10) - 1;
        if (tabIndex < tabs.length) {
          const targetTab = tabs[tabIndex];
          void window.electronAPI.tabs.activate(targetTab.id);
        }
        return;
      }

      // Ctrl/Cmd+Tab: Next tab
      if (ctrlOrCmd && event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
        if (currentIndex >= 0) {
          const nextIndex = (currentIndex + 1) % tabs.length;
          void window.electronAPI.tabs.activate(tabs[nextIndex].id);
        }
        return;
      }

      // Ctrl/Cmd+Shift+Tab: Previous tab
      if (ctrlOrCmd && event.key === 'Tab' && event.shiftKey) {
        event.preventDefault();
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
        if (currentIndex >= 0) {
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          void window.electronAPI.tabs.activate(tabs[prevIndex].id);
        }
        return;
      }

      // Ctrl/Cmd+Shift+R: Hard reload (ignore cache)
      if (ctrlOrCmd && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        const activeTab = tabs.find((tab) => tab.id === activeTabId);
        if (activeTab) {
          void window.electronAPI.tabs.refresh({
            id: activeTab.id,
            url: activeTab.url,
            mode: 'hard',
            reason: 'user'
          });
        }
        return;
      }

      // Ctrl/Cmd+D: Bookmark current page
      if (ctrlOrCmd && event.key === 'd') {
        event.preventDefault();
        // Trigger bookmark button click
        const bookmarkButton = document.querySelector('button[title*="收藏"]') as HTMLButtonElement;
        if (bookmarkButton) {
          bookmarkButton.click();
        }
        return;
      }

      // Ctrl/Cmd+B: Open bookmarks panel
      if (ctrlOrCmd && event.key === 'b') {
        event.preventDefault();
        const bookmarksButton = document.querySelector('button[title*="管理書籤"]') as HTMLButtonElement;
        if (bookmarksButton) {
          bookmarksButton.click();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabs, activeTabId]);
};
