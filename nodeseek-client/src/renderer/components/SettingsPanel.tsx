import { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { AppConfig } from '@shared/types/config';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const Panel = styled.div`
  background: linear-gradient(135deg, rgba(15, 17, 25, 0.98), rgba(20, 25, 40, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #f8fafc;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.16);
    color: #f8fafc;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`;

const Section = styled.div`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #cbd5e1;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    display: block;
    width: 4px;
    height: 16px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border-radius: 2px;
  }
`;

const SettingItem = styled.div`
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const Select = styled.select`
  width: 100%;
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const Button = styled.button<{ $primary?: boolean }>`
  height: 40px;
  padding: 0 24px;
  border-radius: 8px;
  border: none;
  background: ${({ $primary }) =>
    $primary ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255, 255, 255, 0.08)'};
  color: #f8fafc;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $primary }) =>
      $primary ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'rgba(255, 255, 255, 0.16)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Message = styled.div<{ $type: 'success' | 'error' }>`
  padding: 12px 16px;
  border-radius: 8px;
  background: ${({ $type }) =>
    $type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
  border: 1px solid
    ${({ $type }) => ($type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)')};
  color: ${({ $type }) => ($type === 'success' ? '#4ade80' : '#f87171')};
  font-size: 14px;
  margin-bottom: 20px;
`;

export const SettingsPanel = ({ open, onClose }: SettingsPanelProps) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    try {
      const cfg = await window.electronAPI.config.get();
      setConfig(cfg);
    } catch (error) {
      console.error('[SettingsPanel] Failed to load config:', error);
      setMessage({ type: 'error', text: '載入配置失敗' });
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setLoading(true);
    setMessage(null);

    try {
      await window.electronAPI.config.update(config);
      setMessage({ type: 'success', text: '配置已成功保存' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('[SettingsPanel] Failed to save config:', error);
      setMessage({ type: 'error', text: '保存配置失敗' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (path: string, value: any) => {
    if (!config) return;

    const keys = path.split('.');
    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
  };

  if (!config) {
    return null;
  }

  return (
    <Overlay $open={open} onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>設定</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        <Content>
          {message && <Message $type={message.type}>{message.text}</Message>}

          {/* UI Settings */}
          <Section>
            <SectionTitle>界面設定</SectionTitle>
            <SettingItem>
              <Label>主題</Label>
              <Select
                value={config.ui.theme}
                onChange={(e) => handleChange('ui.theme', e.target.value)}
              >
                <option value="dark">深色</option>
                <option value="light">淺色</option>
              </Select>
            </SettingItem>
            <SettingItem>
              <Label>字體大小</Label>
              <Input
                type="number"
                min="12"
                max="20"
                value={config.ui.fontSize}
                onChange={(e) => handleChange('ui.fontSize', parseInt(e.target.value, 10))}
              />
            </SettingItem>
            <SettingItem>
              <CheckboxWrapper>
                <Checkbox
                  type="checkbox"
                  checked={config.ui.showLoginStatus}
                  onChange={(e) => handleChange('ui.showLoginStatus', e.target.checked)}
                />
                <Label style={{ marginBottom: 0 }}>顯示登錄狀態</Label>
              </CheckboxWrapper>
            </SettingItem>
          </Section>

          {/* Resource Limits */}
          <Section>
            <SectionTitle>資源限制</SectionTitle>
            <SettingItem>
              <Label>最大記憶體 (MB)</Label>
              <Input
                type="number"
                min="512"
                max="8192"
                step="256"
                value={config.resourceLimits.maxMemoryMB}
                onChange={(e) => handleChange('resourceLimits.maxMemoryMB', parseInt(e.target.value, 10))}
              />
            </SettingItem>
            <SettingItem>
              <Label>最大 CPU 使用率 (%)</Label>
              <Input
                type="number"
                min="10"
                max="100"
                step="5"
                value={config.resourceLimits.maxCpuPercent}
                onChange={(e) =>
                  handleChange('resourceLimits.maxCpuPercent', parseInt(e.target.value, 10))
                }
              />
            </SettingItem>
            <SettingItem>
              <Label>檢查間隔 (毫秒)</Label>
              <Input
                type="number"
                min="5000"
                max="60000"
                step="5000"
                value={config.resourceLimits.checkInterval}
                onChange={(e) =>
                  handleChange('resourceLimits.checkInterval', parseInt(e.target.value, 10))
                }
              />
            </SettingItem>
          </Section>

          {/* WebDAV Sync */}
          <Section>
            <SectionTitle>WebDAV 同步</SectionTitle>
            <SettingItem>
              <Label>WebDAV URL</Label>
              <Input
                type="text"
                placeholder="https://dav.example.com"
                value={config.webdav.url}
                onChange={(e) => handleChange('webdav.url', e.target.value)}
              />
            </SettingItem>
            <SettingItem>
              <Label>用戶名</Label>
              <Input
                type="text"
                value={config.webdav.username}
                onChange={(e) => handleChange('webdav.username', e.target.value)}
              />
            </SettingItem>
            <SettingItem>
              <Label>密碼</Label>
              <Input
                type="password"
                value={config.webdav.password}
                onChange={(e) => handleChange('webdav.password', e.target.value)}
              />
            </SettingItem>
            <SettingItem>
              <Label>同步間隔 (毫秒，0表示禁用自動同步)</Label>
              <Input
                type="number"
                min="0"
                max="3600000"
                step="60000"
                value={config.webdav.syncInterval}
                onChange={(e) => handleChange('webdav.syncInterval', parseInt(e.target.value, 10))}
              />
            </SettingItem>
          </Section>

          {/* Security Settings */}
          <Section>
            <SectionTitle>安全設定</SectionTitle>
            <SettingItem>
              <CheckboxWrapper>
                <Checkbox
                  type="checkbox"
                  checked={config.security.encryptLocalData}
                  onChange={(e) => handleChange('security.encryptLocalData', e.target.checked)}
                />
                <Label style={{ marginBottom: 0 }}>加密本地數據</Label>
              </CheckboxWrapper>
            </SettingItem>
            <SettingItem>
              <Label>自動鎖定超時 (分鐘，0表示禁用)</Label>
              <Input
                type="number"
                min="0"
                max="120"
                step="5"
                value={config.security.autoLockTimeout}
                onChange={(e) =>
                  handleChange('security.autoLockTimeout', parseInt(e.target.value, 10))
                }
              />
            </SettingItem>
          </Section>

          {/* Auth Settings */}
          <Section>
            <SectionTitle>認證設定</SectionTitle>
            <SettingItem>
              <Label>登錄 URL</Label>
              <Input
                type="text"
                value={config.auth.loginUrl}
                onChange={(e) => handleChange('auth.loginUrl', e.target.value)}
              />
            </SettingItem>
            <SettingItem>
              <Label>會話超時 (秒)</Label>
              <Input
                type="number"
                min="300"
                max="86400"
                step="300"
                value={config.auth.sessionTimeout}
                onChange={(e) => handleChange('auth.sessionTimeout', parseInt(e.target.value, 10))}
              />
            </SettingItem>
            <SettingItem>
              <CheckboxWrapper>
                <Checkbox
                  type="checkbox"
                  checked={config.auth.autoRefresh}
                  onChange={(e) => handleChange('auth.autoRefresh', e.target.checked)}
                />
                <Label style={{ marginBottom: 0 }}>自動刷新會話</Label>
              </CheckboxWrapper>
            </SettingItem>
            <SettingItem>
              <CheckboxWrapper>
                <Checkbox
                  type="checkbox"
                  checked={config.auth.encryptStorage}
                  onChange={(e) => handleChange('auth.encryptStorage', e.target.checked)}
                />
                <Label style={{ marginBottom: 0 }}>加密存儲憑證</Label>
              </CheckboxWrapper>
            </SettingItem>
          </Section>

          {/* Session Settings */}
          <Section>
            <SectionTitle>會話設定</SectionTitle>
            <SettingItem>
              <Label>Cookie 域</Label>
              <Input
                type="text"
                value={config.session.cookieDomain}
                onChange={(e) => handleChange('session.cookieDomain', e.target.value)}
              />
            </SettingItem>
            <SettingItem>
              <CheckboxWrapper>
                <Checkbox
                  type="checkbox"
                  checked={config.session.persistCookies}
                  onChange={(e) => handleChange('session.persistCookies', e.target.checked)}
                />
                <Label style={{ marginBottom: 0 }}>持久化 Cookie</Label>
              </CheckboxWrapper>
            </SettingItem>
            <SettingItem>
              <CheckboxWrapper>
                <Checkbox
                  type="checkbox"
                  checked={config.session.shareAcrossTabs}
                  onChange={(e) => handleChange('session.shareAcrossTabs', e.target.checked)}
                />
                <Label style={{ marginBottom: 0 }}>標籤頁間共享會話</Label>
              </CheckboxWrapper>
            </SettingItem>
          </Section>
        </Content>

        <Footer>
          <Button onClick={onClose}>取消</Button>
          <Button $primary onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
        </Footer>
      </Panel>
    </Overlay>
  );
};
