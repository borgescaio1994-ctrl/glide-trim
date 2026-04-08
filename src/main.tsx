import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import App from './App.tsx';
import './index.css';

/** Entrada da SPA: App → rota "/" → Index → ClientHome (layout da barbearia para clientes). */

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const v = encodeURIComponent(import.meta.env.VITE_APP_VERSION || '0');
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js?v=${v}`)
      .catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
