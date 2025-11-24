import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './pages/App';
import './styles/global.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('找不到根節點');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
