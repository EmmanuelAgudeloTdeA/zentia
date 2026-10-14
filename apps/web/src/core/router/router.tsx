import { createBrowserRouter } from 'react-router';
import { HomePage } from '../../features/home';
import { AppLayout, NotFoundPage } from '../layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
