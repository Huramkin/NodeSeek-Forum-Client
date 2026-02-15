import styled from 'styled-components';
import { useTabStore } from '../store/tabStore';

const Container = styled.div`
  display: flex;
  align-items: center;
  height: 40px;
  background: rgba(15, 17, 25, 0.9);
  padding: 0 8px;
  gap: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const Tab = styled.button<{ $active: boolean }>`
  min-width: 140px;
  max-width: 220px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  background: ${({ $active }) => ($active ? 'rgba(64, 128, 255, 0.18)' : 'transparent')};
  color: #f8fafc;
  font-size: 13px;
  transition: background 0.2s ease;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const Favicon = styled.img`
  width: 16px;
  height: 16px;
  border-radius: 4px;
  object-fit: cover;
`;

const Title = styled.span`
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CloseButton = styled.span`
  font-size: 12px;
  opacity: 0.6;
  padding: 2px;
  border-radius: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    opacity: 1;
  }
`;

const AddButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.07);
  color: #f8fafc;
  cursor: pointer;
  font-size: 18px;
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const DEFAULT_FAVICON = 'https://nodeseek.com/favicon.ico';

export const TabBar = () => {
  const { tabs, activeTabId } = useTabStore();

  const handleCreate = () => {
    void window.electronAPI.tabs.create();
  };

  const handleActivate = (id: string) => {
    void window.electronAPI.tabs.activate(id);
  };

  const handleClose = (id: string) => {
    void window.electronAPI.tabs.close(id);
  };

  return (
    <Container>
      {tabs.map((tab) => (
        <Tab key={tab.id} $active={tab.id === activeTabId} onClick={() => handleActivate(tab.id)}>
          <Favicon
            src={tab.favicon ?? DEFAULT_FAVICON}
            alt=""
            onError={(event) => (event.currentTarget.src = DEFAULT_FAVICON)}
          />
          <Title>{tab.title}</Title>
          <CloseButton
            onClick={(event) => {
              event.stopPropagation();
              handleClose(tab.id);
            }}
          >
            ×
          </CloseButton>
        </Tab>
      ))}
      <AddButton title="新建標籤頁" onClick={handleCreate}>
        +
      </AddButton>
    </Container>
  );
};
