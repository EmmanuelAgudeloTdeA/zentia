import { zodResolver } from '@hookform/resolvers/zod';
import {
  BANK_ACCOUNTS_MAX_LENGTH,
  COMMERCIAL_TERMS_MAX_LENGTH,
  DOCUMENT_LOCALES,
  updateCompanyProfileSchema,
  type CompanyProfileChanges,
  type CompanySettingsDto,
  type UpdateCompanyProfileRequest,
} from '@zentia/shared';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useBrandingStore } from '../../../core/branding';
import { errorKey } from '../../../core/errors';
import { Alert, Button, SectionCard, Select, TextArea, TextField, toast } from '../../../shared/ui';
import { companyService } from '../services/company.service';
import { ErrorSummary } from './error-summary';
import { applyServerIssues, fieldErrorKey } from './field-errors';

const PROFILE_FIELDS = [
  'name',
  'taxId',
  'address',
  'city',
  'phone',
  'email',
  'website',
  'bankAccounts',
  'commercialTerms',
  'documentLocale',
] as const;

interface ProfileFormValues {
  name: string;
  taxId: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  bankAccounts: string;
  commercialTerms: string;
  documentLocale: CompanySettingsDto['documentLocale'];
}

function toFormValues(settings: CompanySettingsDto): ProfileFormValues {
  return {
    name: settings.name ?? '',
    taxId: settings.taxId ?? '',
    address: settings.address ?? '',
    city: settings.city ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    website: settings.website ?? '',
    bankAccounts: settings.bankAccounts ?? '',
    commercialTerms: settings.commercialTerms ?? '',
    documentLocale: settings.documentLocale,
  };
}

interface CompanyProfileFormProps {
  settings: CompanySettingsDto;
  onSaved: (settings: CompanySettingsDto) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function CompanyProfileForm({ settings, onSaved, onDirtyChange }: CompanyProfileFormProps) {
  const { t } = useTranslation();
  const setBranding = useBrandingStore((state) => state.setBranding);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateCompanyProfileRequest, unknown, CompanyProfileChanges>({
    resolver: zodResolver(updateCompanyProfileSchema),
    mode: 'onTouched',
    defaultValues: toFormValues(settings),
  });
  const commercialTerms = useWatch({ control, name: 'commercialTerms' }) ?? '';

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const onSubmit = handleSubmit(async (changes) => {
    setServerError(null);
    try {
      const saved = await companyService.updateProfile(changes);
      reset(toFormValues(saved));
      setBranding({ name: saved.name });
      onSaved(saved);
      toast.success(t('settings.saved'));
    } catch (error) {
      if (!applyServerIssues(error, setError, PROFILE_FIELDS)) setServerError(errorKey(error));
    }
  });

  const fieldError = (key: (typeof PROFILE_FIELDS)[number]) => {
    const messageKey = fieldErrorKey(errors[key]);
    return messageKey ? t(messageKey) : undefined;
  };

  return (
    <SectionCard title={t('settings.profile.section')}>
      <form noValidate onSubmit={onSubmit} className="space-y-5">
        {serverError ? <Alert tone="danger">{t(serverError)}</Alert> : null}
        <ErrorSummary errors={errors} />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label={t('settings.profile.name')}
            maxLength={150}
            hint={t('settings.profile.nameHint')}
            error={fieldError('name')}
            className="md:col-span-2"
            {...register('name')}
          />
          <TextField
            label={t('settings.profile.taxId')}
            maxLength={30}
            error={fieldError('taxId')}
            {...register('taxId')}
          />
          <TextField
            label={t('settings.profile.phone')}
            maxLength={30}
            type="tel"
            error={fieldError('phone')}
            {...register('phone')}
          />
          <TextField
            label={t('settings.profile.address')}
            maxLength={250}
            error={fieldError('address')}
            {...register('address')}
          />
          <TextField
            label={t('settings.profile.city')}
            maxLength={100}
            error={fieldError('city')}
            {...register('city')}
          />
          <TextField
            label={t('settings.profile.email')}
            maxLength={150}
            type="email"
            inputMode="email"
            error={fieldError('email')}
            {...register('email')}
          />
          <TextField
            label={t('settings.profile.website')}
            maxLength={150}
            inputMode="url"
            placeholder={t('settings.profile.websitePlaceholder')}
            error={fieldError('website')}
            {...register('website')}
          />
          <TextArea
            label={t('settings.profile.bankAccounts')}
            maxLength={BANK_ACCOUNTS_MAX_LENGTH}
            placeholder={t('settings.profile.bankAccountsPlaceholder')}
            hint={t('settings.profile.bankAccountsHint')}
            error={fieldError('bankAccounts')}
            className="md:col-span-2"
            {...register('bankAccounts')}
          />
          <TextArea
            label={t('settings.profile.commercialTerms')}
            maxLength={COMMERCIAL_TERMS_MAX_LENGTH}
            hint={t('settings.profile.commercialTermsHint', {
              count: commercialTerms.length,
              max: COMMERCIAL_TERMS_MAX_LENGTH,
            })}
            error={fieldError('commercialTerms')}
            className="md:col-span-2"
            {...register('commercialTerms')}
          />
          <Select
            label={t('settings.profile.documentLocale')}
            required
            hint={t('settings.profile.documentLocaleHint')}
            options={DOCUMENT_LOCALES.map((locale) => ({
              value: locale,
              label: t(`enums.DocumentLocale.${locale}`),
            }))}
            error={fieldError('documentLocale')}
            {...register('documentLocale')}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting}>
            {t('settings.profile.submit')}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
