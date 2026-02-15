import { useState } from 'react';
import styled from 'styled-components';

interface LoginPanelProps {
  open: boolean;
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<void>;
}

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 1001;
  backdrop-filter: blur(8px);
`;

const Panel = styled.div`
  background: linear-gradient(135deg, rgba(15, 17, 25, 0.98), rgba(20, 25, 40, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  width: 90%;
  max-width: 480px;
  overflow: hidden;
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
`;

const Header = styled.div`
  padding: 32px 32px 24px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Logo = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  color: white;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
`;

const Title = styled.h2`
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #f8fafc;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
`;

const Content = styled.div`
  padding: 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #cbd5e1;
`;

const Input = styled.input`
  height: 48px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  padding: 0 16px;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #64748b;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  height: 48px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $variant }) =>
    $variant === 'primary'
      ? `
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  `
      : `
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e1;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const Message = styled.div<{ $type: 'success' | 'error' | 'info' }>`
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;

  ${({ $type }) => {
    switch ($type) {
      case 'success':
        return `
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        `;
      case 'error':
        return `
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        `;
      case 'info':
        return `
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
        `;
    }
  }}
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0;
  color: #64748b;
  font-size: 13px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const OAuthButton = styled.button`
  width: 100%;
  height: 48px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const Footer = styled.div`
  padding: 20px 32px;
  background: rgba(0, 0, 0, 0.2);
  text-align: center;
  font-size: 13px;
  color: #64748b;
`;

export const LoginPanel = ({ open, onClose, onLogin }: LoginPanelProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setMessage({ type: 'error', text: '請填寫用戶名和密碼' });
      return;
    }

    setLoading(true);
    setMessage({ type: 'info', text: '正在登錄...' });

    try {
      // Call the login callback and wait for it to complete
      await onLogin(username, password);
      setMessage({ type: 'success', text: '登錄成功！' });
      
      // Close panel after a short delay
      setTimeout(() => {
        onClose();
        setUsername('');
        setPassword('');
        setMessage(null);
      }, 1500);
    } catch (error) {
      console.error('[LoginPanel] Login failed:', error);
      setMessage({ type: 'error', text: '登錄失敗，請檢查憑證' });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    setMessage({
      type: 'info',
      text: 'OAuth 登錄功能即將推出。請使用用戶名/密碼登錄。'
    });
  };

  return (
    <Overlay $open={open} onClick={onClose}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <Header>
          <Logo>NS</Logo>
          <Title>登錄 NodeSeek</Title>
          <Subtitle>連接到 NodeSeek DeepFlood 論壇</Subtitle>
        </Header>

        <Content>
          {message && <Message $type={message.type}>{message.text}</Message>}

          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>用戶名</Label>
              <Input
                type="text"
                placeholder="輸入您的 NodeSeek 用戶名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </FormGroup>

            <FormGroup>
              <Label>密碼</Label>
              <Input
                type="password"
                placeholder="輸入您的密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </FormGroup>

            <ButtonGroup>
              <Button type="button" $variant="secondary" onClick={onClose} disabled={loading}>
                取消
              </Button>
              <Button type="submit" $variant="primary" disabled={loading}>
                {loading ? '登錄中...' : '登錄'}
              </Button>
            </ButtonGroup>
          </Form>

          <Divider>或</Divider>

          <OAuthButton onClick={handleOAuthLogin} disabled={loading}>
            <span>🌐</span>
            通過瀏覽器登錄
          </OAuthButton>
        </Content>

        <Footer>
          您的憑證將被安全地存儲在系統鑰匙串中
        </Footer>
      </Panel>
    </Overlay>
  );
};
