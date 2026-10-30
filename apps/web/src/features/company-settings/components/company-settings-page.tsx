import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../core/layout';
import { ErrorMessage, Skeleton } from '../../../shared/ui';
import { useCompanySettings } from '../hooks/use-company-settings';
import { SettingsEditor } from './settings-editor';

function SettingsSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2" aria-busy="true">
      <div className="space-y-5">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <div className="space-y-5">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function CompanySettingsPage() {
  const { t } = useTranslation();
  const { state, reload, replace } = useCompanySettings();

  if (state.status === 'ready')
    return <SettingsEditor settings={state.settings} onSaved={replace} />;

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      {state.status === 'loading' ? <SettingsSkeleton /> : null}
      {state.status === 'error' ? (
        <ErrorMessage error={state.error} onRetry={() => void reload()} />
      ) : null}
    </>
  );
}
