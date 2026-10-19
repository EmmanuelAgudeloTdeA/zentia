import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SpinnerIcon } from './icons';

const SLOW_AFTER_MS = 10_000;

export function PageLoader() {
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-100 px-4 text-center"
    >
      <SpinnerIcon size={32} className="animate-spin text-primary-600" />
      <p className="text-body text-neutral-600">{t('common.loading')}</p>
      {slow ? <p className="text-body-sm text-neutral-500">{t('common.slowLoading')}</p> : null}
    </div>
  );
}
