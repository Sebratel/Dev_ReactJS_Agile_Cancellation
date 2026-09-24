import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers/app-providers';
import '@/design-system/tokens.css';
import '@/design-system/typography.css';
import '@/app/config/global.css';

// Após um deploy novo os chunks mudam de hash; um preload de módulo antigo pode
// falhar (arquivo inexistente). O Vite emite `vite:preloadError` — recarregamos
// uma vez para pegar o build atual (o flag evita loop). Complementa o
// lazyWithReload usado no roteamento.
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('chunk-reload-attempted') === '1') {
      return;
    }
    sessionStorage.setItem('chunk-reload-attempted', '1');
  } catch {
    /* sessionStorage indisponível */
  }
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>,
);
