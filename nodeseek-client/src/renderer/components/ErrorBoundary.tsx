import React, { Component, ReactNode } from 'react';
import styled from 'styled-components';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #050607;
  color: #f8fafc;
  padding: 40px;
  text-align: center;
`;

const ErrorTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 16px;
  color: #ef4444;
`;

const ErrorMessage = styled.p`
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 24px;
  max-width: 600px;
  line-height: 1.6;
`;

const ErrorDetails = styled.pre`
  background: rgba(15, 17, 25, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  font-size: 12px;
  color: #cbd5e1;
  text-align: left;
  max-width: 800px;
  max-height: 300px;
  overflow: auto;
  margin-bottom: 24px;
`;

const ReloadButton = styled.button`
  background: rgba(64, 128, 255, 0.8);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(64, 128, 255, 1);
  }
`;

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      
      return (
        <ErrorContainer>
          <ErrorTitle>應用程式發生錯誤</ErrorTitle>
          <ErrorMessage>
            很抱歉，應用程式遇到了意外錯誤。您可以嘗試重新載入應用程式，或聯繫技術支援。
          </ErrorMessage>
          {error && (
            <ErrorDetails>
              <strong>錯誤信息：</strong>
              {'\n'}
              {error.toString()}
              {'\n\n'}
              {errorInfo?.componentStack && (
                <>
                  <strong>組件堆棧：</strong>
                  {'\n'}
                  {errorInfo.componentStack}
                </>
              )}
            </ErrorDetails>
          )}
          <ReloadButton onClick={this.handleReload}>重新載入應用程式</ReloadButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}
