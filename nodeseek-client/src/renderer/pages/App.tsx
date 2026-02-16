import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { TabBar } from '../components/TabBar';
import { AddressBar } from '../components/AddressBar';
import { WebviewHost } from '../components/WebviewHost';
import { useTabStore } from '../store/tabStore';
import { BookmarkManagerPanel } from '../components/BookmarkManagerPanel';
import { SettingsPanel } from '../components/SettingsPanel';
import { LoginPanel } from '../components/LoginPanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const Layout = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  background: #050607;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  margin: 12px;
  overflow: hidden;
`;

const Loading = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 14px;
`;

const Root = styled.div`
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at top, rgba(32, 86, 214, 0.15), transparent 60%);
`;

const App = () => {
  const setSnapshot = useTabStore((state) => state.setSnapshot);
  const loading = useTabStore((state) => state.loading);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; displayName?: string } | null>(null);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Load current user on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await window.electronAPI?.auth?.getCurrentUser();
        if (user) {
          setCurrentUser({ username: user.username, displayName: user.displayName });
        }
      } catch (error) {
        console.error('[App] Failed to load current user:', error);
      }
    };
    void loadCurrentUser();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      const result = await window.electronAPI.auth.login(username, password);
      if (result.success) {
        setCurrentUser({ username: result.username });
      }
    } catch (error) {
      console.error('[App] Login failed:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    if (!currentUser) return;
    
    try {
      const accounts = await window.electronAPI.auth.listAccounts();
      const account = accounts.find(a => a.username === currentUser.username);
      if (account) {
        await window.electronAPI.auth.logout(account.id);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('[App] Logout failed:', error);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    window.electronAPI.tabs
      .list()
      .then((snapshot) => setSnapshot(snapshot))
      .catch((error) => console.error('[renderer] failed to load tabs', error));

    unsubscribe = window.electronAPI.tabs.onState((snapshot) => setSnapshot(snapshot));

    return () => {
      unsubscribe?.();
    };
  }, [setSnapshot]);

  return (
    <ErrorBoundary>
      <Root>
        <Layout>
          <TabBar />
          <AddressBar 
            onOpenBookmarks={() => setBookmarkOpen(true)} 
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenLogin={() => setLoginOpen(true)}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
          {loading ? <Loading>初始化標籤頁...</Loading> : <WebviewHost />}
        </Layout>
        <BookmarkManagerPanel open={bookmarkOpen} onClose={() => setBookmarkOpen(false)} />
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <LoginPanel open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} />
      </Root>
    </ErrorBoundary>
  );
};

export default App;
