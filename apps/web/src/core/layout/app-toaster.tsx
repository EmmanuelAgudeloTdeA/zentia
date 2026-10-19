import { useTranslation } from 'react-i18next';
import { Toaster } from '../../shared/ui';

export function AppToaster() {
  const { t } = useTranslation();
  return <Toaster closeLabel={t('common.close')} />;
}
