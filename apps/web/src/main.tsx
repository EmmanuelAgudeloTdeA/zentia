import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { initI18n } from './core/i18n';
import { AppToaster } from './core/layout';
import { router } from './core/router';
import { bootstrapSession, configureSessionHttpClient } from './features/auth';
import './index.css';

initI18n();
configureSessionHttpClient();
void bootstrapSession();

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <RouterProvider router={router} />
      <AppToaster />
    </StrictMode>,
  );
}
