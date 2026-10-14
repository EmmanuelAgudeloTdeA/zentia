import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { initI18n } from './core/i18n';
import { router } from './core/router';
import './index.css';

initI18n();

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
