import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers/app-providers';
import '@/design-system/tokens.css';
import '@/design-system/typography.css';
import '@/app/config/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>,
);
