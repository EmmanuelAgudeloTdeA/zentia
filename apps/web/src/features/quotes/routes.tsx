import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { QuoteDetailPage } from './components/quote-detail-page';
import { EditQuotePage, NewQuotePage } from './components/quote-editor-page';
import { NEW_QUOTE_PATH, QUOTES_PATH } from './components/quote-paths';
import { QuotesListPage } from './components/quotes-list-page';

export const routes: RouteObject[] = [
  { path: QUOTES_PATH, element: <QuotesListPage /> },
  { path: NEW_QUOTE_PATH, element: <NewQuotePage /> },
  { path: `${QUOTES_PATH}/:id`, element: <QuoteDetailPage /> },
  { path: `${QUOTES_PATH}/:id/edit`, element: <EditQuotePage /> },
];

export const navItems: readonly NavItem[] = [
  { to: QUOTES_PATH, labelKey: 'nav.quotes', order: 10 },
];
