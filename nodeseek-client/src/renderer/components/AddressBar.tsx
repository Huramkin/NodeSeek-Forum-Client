import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTabStore } from '../store/tabStore';
import { normalizeAddress } from '../utils/url';

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(18, 20, 30, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
`;

const Button = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.16);
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

export const AddressBar = () => {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [tabs, activeTabId]);
  const [address, setAddress] = useState(activeTab?.url ?? '');

  useEffect(() => {
    setAddress(activeTab?.url ?? '');
  }, [activeTab?.url]);

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
    const view = activeWebview();
    if (view) {
      view.reload();
    } else if (activeTab) {
      void window.electronAPI.tabs.navigate({ id: activeTab.id, url: activeTab.url });
    }
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
      <form style={{ flex: 1 }} onSubmit={handleSubmit}>
        <Input value={address} onChange={(event) => setAddress(event.target.value)} spellCheck={false} placeholder="輸入 NodeSeek 帖子連結或關鍵字" />
      </form>
    </Container>
  );
};
