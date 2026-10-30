import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../core/layout';
import {
  ConfirmDialog,
  ErrorMessage,
  Skeleton,
  tabId,
  tabPanelId,
  Tabs,
  type TabItem,
} from '../../../shared/ui';
import { useCompanySettings } from '../hooks/use-company-settings';
import { CommercialParametersForm } from './commercial-parameters-form';
import { CompanyProfileForm } from './company-profile-form';
import { LogoUploader } from './logo-uploader';

type SettingsTab = 'profile' | 'parameters';

const TABS_ID = 'company-settings';

function SettingsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-36" />
      <Skeleton className="h-80" />
    </div>
  );
}

export function CompanySettingsPage() {
  const { t } = useTranslation();
  const { state, reload, replace } = useCompanySettings();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [dirty, setDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);

  const tabs: TabItem<SettingsTab>[] = [
    { id: 'profile', label: t('settings.tabs.profile') },
    { id: 'parameters', label: t('settings.tabs.parameters') },
  ];

  const onTabChange = (next: SettingsTab) => {
    if (next === tab) return;
    if (dirty) setPendingTab(next);
    else setTab(next);
  };

  const discardAndSwitch = () => {
    if (pendingTab) setTab(pendingTab);
    setDirty(false);
    setPendingTab(null);
  };

  const onDirtyChange = useCallback((value: boolean) => setDirty(value), []);
  const cancelSwitch = useCallback(() => setPendingTab(null), []);

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="space-y-5">
        <Tabs
          label={t('settings.title')}
          items={tabs}
          value={tab}
          onChange={onTabChange}
          idPrefix={TABS_ID}
        />
        <div
          role="tabpanel"
          id={tabPanelId(TABS_ID, tab)}
          aria-labelledby={tabId(TABS_ID, tab)}
          className="space-y-5"
        >
          {state.status === 'loading' ? <SettingsSkeleton /> : null}
          {state.status === 'error' ? (
            <ErrorMessage error={state.error} onRetry={() => void reload()} />
          ) : null}
          {state.status === 'ready' && tab === 'profile' ? (
            <>
              <LogoUploader />
              <CompanyProfileForm
                settings={state.settings}
                onSaved={replace}
                onDirtyChange={onDirtyChange}
              />
            </>
          ) : null}
          {state.status === 'ready' && tab === 'parameters' ? (
            <CommercialParametersForm
              settings={state.settings}
              onSaved={replace}
              onDirtyChange={onDirtyChange}
            />
          ) : null}
        </div>
      </div>

      {pendingTab ? (
        <ConfirmDialog
          title={t('settings.discard.title')}
          description={t('settings.discard.description')}
          confirmLabel={t('settings.discard.confirm')}
          cancelLabel={t('settings.discard.keepEditing')}
          onConfirm={discardAndSwitch}
          onCancel={cancelSwitch}
        />
      ) : null}
    </>
  );
}
