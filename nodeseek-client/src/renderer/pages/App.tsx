import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { TabBar } from '../components/TabBar';
import { AddressBar } from '../components/AddressBar';
import { WebviewHost } from '../components/WebviewHost';
import { useTabStore } from '../store/tabStore';
import { BookmarkManagerPanel } from '../components/BookmarkManagerPanel';
import { SettingsPanel } from '../components/SettingsPanel';
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
  const { setSnapshot, loading } = useTabStore((state) => ({
    setSnapshot: state.setSnapshot,
    loading: state.loading
  }));
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

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
          />
          {loading ? <Loading>初始化標籤頁...</Loading> : <WebviewHost />}
        </Layout>
        <BookmarkManagerPanel open={bookmarkOpen} onClose={() => setBookmarkOpen(false)} />
        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Root>
    </ErrorBoundary>
  );
};

export default App;
