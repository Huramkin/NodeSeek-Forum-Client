import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useTabStore } from '../store/tabStore';

const Container = styled.div`
  flex: 1;
  background: #050607;
  position: relative;
  overflow: hidden;
`;

const WebviewLayer = styled.div<{ $active: boolean }>`
  position: absolute;
  inset: 0;
  display: ${({ $active }) => ($active ? 'flex' : 'none')};
`;

const SuspendedOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 6, 7, 0.92);
  color: #cbd5f5;
  font-size: 15px;
  letter-spacing: 0.4px;
  flex-direction: column;
  gap: 8px;
`;

const SuspendedButton = styled.button`
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  background: rgba(79, 130, 255, 0.85);
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;

  &:hover {
    background: rgba(79, 130, 255, 1);
  }
`;

const WebviewElement = styled.webview`
  width: 100%;
  height: 100%;
  border: none;
  background: #0c0d12;
`;

const WebviewItem = ({
  tabId,
  url,
  isActive,
  isSuspended
}: {
  tabId: string;
  url: string;
  isActive: boolean;
  isSuspended: boolean;
}) => {
  const ref = useRef<HTMLWebViewElement | null>(null);

  useEffect(() => {
    const webview = ref.current;
    if (!webview) {
      return;
    }

    const handleTitle = (event: any) => {
      void window.electronAPI.tabs.updateMeta({ id: tabId, title: event.title, isLoading: false });
    };

    const handleFavicon = (event: any) => {
      const favicon = event.favicons?.[0];
      if (favicon) {
        void window.electronAPI.tabs.updateMeta({ id: tabId, favicon });
      }
    };

    const handleNavigation = (event: any) => {
      if (event.url) {
        void window.electronAPI.tabs.updateMeta({ id: tabId, url: event.url, isLoading: false });
      }
    };

    const handleStart = () => {
      void window.electronAPI.tabs.updateMeta({ id: tabId, isLoading: true });
    };

    const handleStop = () => {
      void window.electronAPI.tabs.updateMeta({ id: tabId, isLoading: false });
    };

    (webview as any).addEventListener('page-title-updated', handleTitle);
    (webview as any).addEventListener('page-favicon-updated', handleFavicon);
    (webview as any).addEventListener('did-navigate-in-page', handleNavigation);
    (webview as any).addEventListener('did-navigate', handleNavigation);
    (webview as any).addEventListener('did-start-loading', handleStart);
    (webview as any).addEventListener('did-stop-loading', handleStop);

    return () => {
      (webview as any).removeEventListener('page-title-updated', handleTitle);
      (webview as any).removeEventListener('page-favicon-updated', handleFavicon);
      (webview as any).removeEventListener('did-navigate-in-page', handleNavigation);
      (webview as any).removeEventListener('did-navigate', handleNavigation);
      (webview as any).removeEventListener('did-start-loading', handleStart);
      (webview as any).removeEventListener('did-stop-loading', handleStop);
    };
  }, [tabId]);

  useEffect(() => {
    const webview = ref.current;
    if (!webview) {
      return;
    }
    if (isSuspended) {
      if (webview.src !== 'about:blank') {
        webview.src = 'about:blank';
      }
    } else if (webview.src !== url) {
      webview.src = url;
    }
  }, [url, isSuspended]);

  useEffect(() => {
    if (!isActive || !isSuspended) {
      return;
    }
    void window.electronAPI.tabs.refresh({ id: tabId, url, mode: 'hard', reason: 'resume' });
  }, [isActive, isSuspended, tabId, url]);

  const handleResume = () => {
    void window.electronAPI.tabs.refresh({ id: tabId, url, mode: 'hard', reason: 'resume' });
  };

  return (
    <WebviewLayer $active={isActive}>
      {!isSuspended ? (
        <WebviewElement
          ref={ref}
          data-tab-id={tabId}
          partition="persist:nodeseek"
          allowpopups="true"
          src={url}
        />
      ) : (
        <SuspendedOverlay>
          <p>此標籤頁因資源限制已卸載</p>
          <SuspendedButton onClick={handleResume}>重新載入</SuspendedButton>
        </SuspendedOverlay>
      )}
    </WebviewLayer>
  );
};

export const WebviewHost = () => {
  const { tabs, activeTabId } = useTabStore();

  useEffect(() => {
    const unsubscribeReload = window.electronAPI.tabs.onReload((payload) => {
      const view = document.querySelector(
        `webview[data-tab-id="${payload.id}"]`
      ) as HTMLWebViewElement | null;
      if (!view) {
        return;
      }
      if (payload.mode === 'hard') {
        if (payload.url) {
          view.src = payload.url;
          return;
        }
        const reloadIgnoringCache = (view as any).reloadIgnoringCache?.bind(view);
        if (reloadIgnoringCache) {
          reloadIgnoringCache();
          return;
        }
      }
      view.reload();
    });
    const unsubscribeForceUnload = window.electronAPI.tabs.onForceUnload((id) => {
      const view = document.querySelector(`webview[data-tab-id="${id}"]`) as HTMLWebViewElement | null;
      if (view) {
        view.src = 'about:blank';
      }
    });
    return () => {
      unsubscribeReload();
      unsubscribeForceUnload();
    };
  }, []);

  return (
    <Container>
      {tabs.map((tab) => (
        <WebviewItem
          key={tab.id}
          tabId={tab.id}
          url={tab.url}
          isActive={tab.id === activeTabId}
          isSuspended={tab.isSuspended}
        />
      ))}
    </Container>
  );
};
