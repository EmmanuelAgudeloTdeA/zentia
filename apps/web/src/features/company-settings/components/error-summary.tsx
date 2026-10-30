import { useTranslation } from 'react-i18next';
import { Alert } from '../../../shared/ui';

const SUMMARY_THRESHOLD = 3;

export function ErrorSummary({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= SUMMARY_THRESHOLD) return null;
  return <Alert tone="danger">{t('settings.errorSummary', { count })}</Alert>;
}
