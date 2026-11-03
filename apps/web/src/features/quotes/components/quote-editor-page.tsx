import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useParams } from 'react-router';
import { isApiError } from '../../../core/errors';
import { PageHeader } from '../../../core/layout';
import { EmptyState, ErrorMessage, FileTextIcon, Skeleton } from '../../../shared/ui';
import { useQuote } from '../hooks/use-quote';
import { QuoteEditor, type DuplicateNotice } from './quote-editor';
import { quotePath, QUOTES_PATH } from './quote-paths';

export function NewQuotePage() {
  return <QuoteEditor />;
}

export function EditQuotePage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const location = useLocation();
  const notice = (location.state as { duplicate?: DuplicateNotice } | null)?.duplicate;
  const { state, reload } = useQuote(id);
  const [editorKey, setEditorKey] = useState(0);

  if (state.status === 'loading') {
    return (
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]" aria-busy="true">
        <PageHeader title={<Skeleton className="h-8 w-56 bg-white/20" />} backTo={QUOTES_PATH} />
        <div className="space-y-5">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  if (state.status === 'error') {
    const notFound = isApiError(state.error) && state.error.code === 'QUOTE_NOT_FOUND';
    return (
      <>
        <PageHeader title={t('quotes.title')} backTo={QUOTES_PATH} />
        {notFound ? (
          <EmptyState
            icon={<FileTextIcon size={40} />}
            title={t('quotes.detail.notFound')}
            action={
              <Link to={QUOTES_PATH} className="text-primary-600 hover:underline">
                {t('quotes.detail.backToList')}
              </Link>
            }
          />
        ) : (
          <ErrorMessage error={state.error} onRetry={() => void reload()} />
        )}
      </>
    );
  }
  if (!state.data.allowedActions.includes('edit')) {
    return (
      <>
        <PageHeader title={state.data.displayNumber} backTo={quotePath(state.data.id)} />
        <EmptyState
          icon={<FileTextIcon size={40} />}
          title={t('quotes.editor.notEditable')}
          action={
            <Link to={quotePath(state.data.id)} className="text-primary-600 hover:underline">
              {state.data.displayNumber}
            </Link>
          }
        />
      </>
    );
  }
  return (
    <QuoteEditor
      key={`${state.data.updatedAt}-${editorKey}`}
      quote={state.data}
      notice={notice}
      onReload={() => {
        void reload();
        setEditorKey((value) => value + 1);
      }}
    />
  );
}
