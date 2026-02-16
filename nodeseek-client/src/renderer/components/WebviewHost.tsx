import React, { useEffect, useRef } from 'react';
import { useTabStore } from '../store/tabStore';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.tabs?.onReload && typeof (window as any).require !== 'undefined';

const webviewStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  background: '#0c0d12'
};

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
    if (!webview || !isElectron) return;

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
    if (!webview || !isElectron) return;
    if (isSuspended) {
      if (webview.src !== 'about:blank') {
        webview.src = 'about:blank';
      }
    } else if (webview.src !== url) {
      webview.src = url;
    }
  }, [url, isSuspended]);

  useEffect(() => {
    if (!isActive || !isSuspended) return;
    void window.electronAPI.tabs.refresh({ id: tabId, url, mode: 'hard', reason: 'resume' });
  }, [isActive, isSuspended, tabId, url]);

  const handleResume = () => {
    void window.electronAPI.tabs.refresh({ id: tabId, url, mode: 'hard', reason: 'resume' });
  };

  return (
    <div className={`absolute inset-0 ${isActive ? 'flex' : 'hidden'}`}>
      {isSuspended ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/[0.92] text-text-muted text-[15px] tracking-wide">
          <p>此標籤頁因資源限制已卸載</p>
          <button
            onClick={handleResume}
            className="border-none px-5 py-2 rounded-md bg-accent-solid text-white cursor-pointer text-sm font-semibold hover:bg-accent-hover"
          >
            重新載入
          </button>
        </div>
      ) : isElectron ? (
        <webview
          ref={ref}
          data-tab-id={tabId}
          partition="persist:nodeseek"
          allowpopups="true"
          src={url}
          style={webviewStyle}
        />
      ) : (
        <iframe
          data-tab-id={tabId}
          src={url}
          style={webviewStyle}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title={`tab-${tabId}`}
        />
      )}
    </div>
  );
};

export const WebviewHost = () => {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);

  useEffect(() => {
    if (!isElectron) return;

    const unsubscribeReload = window.electronAPI.tabs.onReload((payload) => {
      const view = document.querySelector(
        `webview[data-tab-id="${payload.id}"]`
      ) as HTMLWebViewElement | null;
      if (!view) return;
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
    <div className="flex-1 bg-surface relative overflow-hidden">
      {tabs.map((tab) => (
        <WebviewItem
          key={tab.id}
          tabId={tab.id}
          url={tab.url}
          isActive={tab.id === activeTabId}
          isSuspended={tab.isSuspended}
        />
      ))}
    </div>
  );
};
