import { EXPIRING_ALERT_DAYS_LT_VALIDITY, type CompanySettingsDto } from '@zentia/shared';
import { useCallback, useEffect, useState, type BaseSyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useBeforeUnload, useBlocker } from 'react-router';
import { useBrandingStore } from '../../../core/branding';
import { errorKey } from '../../../core/errors';
import { PageHeader } from '../../../core/layout';
import { Alert, Button, CheckIcon, ConfirmDialog, toast } from '../../../shared/ui';
import { companyService } from '../services/company.service';
import { BrandCard, type PendingLogo } from './brand-card';
import { ErrorSummary } from './error-summary';
import { applyServerIssues, fieldErrorKey } from './field-errors';
import { DiscountsCard, TaxesCard, ValidityCard } from './parameter-cards';
import { BankAccountsCard, CompanyCard, DocumentsCard } from './profile-cards';
import {
  PARAMETER_FIELDS,
  PROFILE_FIELDS,
  toParameterValues,
  toProfileValues,
  useParametersForm,
  useProfileForm,
  type ParameterField,
  type ProfileField,
} from './settings-forms';

type HandleSubmit<T> = (
  onValid: (values: T) => void,
) => (event?: BaseSyntheticEvent) => Promise<void>;

function validated<T>(handleSubmit: HandleSubmit<T>): Promise<T | null> {
  return new Promise((resolve) => {
    void handleSubmit(resolve)().then(() => resolve(null));
  });
}

type SaveStatus = 'saved' | 'dirty' | 'saving';

function StatusChip({ status }: { status: SaveStatus }) {
  const { t } = useTranslation();
  const dot = {
    saved: 'bg-success-border',
    dirty: 'bg-warning-border animate-pulse',
    saving: 'bg-primary-200 animate-pulse',
  }[status];

  return (
    <span
      role="status"
      className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-3.5 text-body-sm text-white/90"
    >
      {status === 'saved' ? (
        <CheckIcon size={14} className="text-success-border" />
      ) : (
        <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />
      )}
      {t(`settings.status.${status}`)}
    </span>
  );
}

interface SettingsEditorProps {
  settings: CompanySettingsDto;
  onSaved: (settings: CompanySettingsDto) => void;
}

export function SettingsEditor({ settings, onSaved }: SettingsEditorProps) {
  const { t } = useTranslation();
  const setBranding = useBrandingStore((state) => state.setBranding);
  const profile = useProfileForm(settings);
  const parameters = useParametersForm(settings);
  const [pendingLogo, setPendingLogo] = useState<PendingLogo | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [headerActions, setHeaderActions] = useState<HTMLElement | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);

  const profileErrors = profile.formState.errors;
  const parameterErrors = parameters.formState.errors;
  const dirty = profile.formState.isDirty || parameters.formState.isDirty || pendingLogo !== null;
  const status: SaveStatus = saving ? 'saving' : dirty ? 'dirty' : 'saved';

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !saving && currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty) event.preventDefault();
      },
      [dirty],
    ),
  );

  useEffect(() => {
    if (!headerActions || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setHeaderVisible(entry?.isIntersecting ?? true),
    );
    observer.observe(headerActions);
    return () => observer.disconnect();
  }, [headerActions]);

  const profileError = (field: ProfileField) => {
    const key = fieldErrorKey(profileErrors[field]);
    return key ? t(key) : undefined;
  };
  const parameterError = (field: ParameterField) => {
    const key = fieldErrorKey(parameterErrors[field]);
    return key ? t(key, { validityDays: parameters.getValues('validityDays') }) : undefined;
  };

  const discard = () => {
    profile.reset();
    parameters.reset();
    setPendingLogo(null);
    setLogoError(null);
    setServerError(null);
  };

  const save = async () => {
    setServerError(null);
    const [profileValues, parameterValues] = await Promise.all([
      validated(profile.handleSubmit),
      validated(parameters.handleSubmit),
    ]);
    if (!profileValues || !parameterValues) return;

    setSaving(true);
    let failed = false;
    let latest: CompanySettingsDto | null = null;
    const fail = (error: unknown) => {
      failed = true;
      setServerError(errorKey(error));
    };

    if (pendingLogo) {
      try {
        const data = pendingLogo.dataUrl.slice(pendingLogo.dataUrl.indexOf(',') + 1);
        const result = await companyService.uploadLogo({ mimeType: pendingLogo.mimeType, data });
        setBranding({ hasLogo: true, logoVersion: result.logoVersion });
        setPendingLogo(null);
      } catch (error) {
        failed = true;
        setLogoError(errorKey(error));
      }
    }
    if (profile.formState.isDirty) {
      try {
        latest = await companyService.updateProfile(profileValues);
        profile.reset(toProfileValues(latest));
        setBranding({ name: latest.name });
      } catch (error) {
        if (applyServerIssues(error, profile.setError, PROFILE_FIELDS)) failed = true;
        else fail(error);
      }
    }
    if (parameters.formState.isDirty) {
      try {
        latest = await companyService.updateParameters(parameterValues);
        parameters.reset(toParameterValues(latest));
      } catch (error) {
        const placed = applyServerIssues(error, parameters.setError, PARAMETER_FIELDS, {
          expiringAlertDays: EXPIRING_ALERT_DAYS_LT_VALIDITY,
        });
        if (placed) failed = true;
        else fail(error);
      }
    }

    if (latest) onSaved(latest);
    if (!failed) toast.success(t('settings.saved'));
    setSaving(false);
  };

  const actions = (
    <>
      {dirty && !saving ? (
        <Button variant="ghost-on-dark" onClick={discard}>
          {t('settings.discardChanges')}
        </Button>
      ) : null}
      <Button variant="on-dark" loading={saving} disabled={!dirty} onClick={() => void save()}>
        {t('settings.save')}
      </Button>
    </>
  );

  const errorCount = Object.keys(profileErrors).length + Object.keys(parameterErrors).length;

  return (
    <>
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        actions={
          <div ref={setHeaderActions} className="flex flex-wrap items-center gap-2">
            <StatusChip status={status} />
            {actions}
          </div>
        }
      />

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="space-y-5"
      >
        {serverError ? <Alert tone="danger">{t(serverError)}</Alert> : null}
        <ErrorSummary count={errorCount} />
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-5">
            <CompanyCard form={profile} fieldError={profileError} />
            <DiscountsCard form={parameters} fieldError={parameterError} />
            <TaxesCard form={parameters} fieldError={parameterError} />
            <DocumentsCard form={profile} fieldError={profileError} />
          </div>
          <div className="min-w-0 space-y-5">
            <BrandCard
              profile={profile}
              pending={pendingLogo}
              onPendingChange={(logo) => {
                setPendingLogo(logo);
                setLogoError(null);
              }}
              error={logoError}
              onErrorChange={setLogoError}
            />
            <ValidityCard form={parameters} fieldError={parameterError} />
            <BankAccountsCard form={profile} fieldError={profileError} />
          </div>
        </div>
      </form>

      {dirty && !headerVisible ? (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-primary-900 py-2 pr-2 pl-4 text-white shadow-lg">
            <span className="text-body-sm">{t('settings.status.dirty')}</span>
            {actions}
          </div>
        </div>
      ) : null}

      {blocker.state === 'blocked' ? (
        <ConfirmDialog
          title={t('settings.discard.title')}
          description={t('settings.discard.description')}
          confirmLabel={t('settings.discard.confirm')}
          cancelLabel={t('settings.discard.keepEditing')}
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      ) : null}
    </>
  );
}
