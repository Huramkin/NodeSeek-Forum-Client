interface HTMLWebViewElement extends HTMLElement {
  src: string;
  reload(): void;
  reloadIgnoringCache(): void;
  loadURL(url: string): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
  goBack(): void;
  goForward(): void;
  executeJavaScript<T>(code: string): Promise<T>;
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLWebViewElement>, HTMLWebViewElement> & {
      src?: string;
      partition?: string;
      allowpopups?: string;
      'data-tab-id'?: string;
    };
  }
}
