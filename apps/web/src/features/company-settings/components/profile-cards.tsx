import {
  BANK_ACCOUNTS_MAX_LENGTH,
  COMMERCIAL_TERMS_MAX_LENGTH,
  DOCUMENT_LOCALES,
} from '@zentia/shared';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SectionCard, Select, TextArea, TextField } from '../../../shared/ui';
import type { ProfileField, ProfileForm } from './settings-forms';

interface ProfileCardProps {
  form: ProfileForm;
  fieldError: (field: ProfileField) => string | undefined;
}

export function CompanyCard({ form: { register }, fieldError }: ProfileCardProps) {
  const { t } = useTranslation();

  return (
    <SectionCard title={t('settings.sections.company')}>
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
        <TextField
          variant="filled"
          label={t('settings.profile.name')}
          maxLength={150}
          hint={t('settings.profile.nameHint')}
          error={fieldError('name')}
          className="sm:col-span-2"
          {...register('name')}
        />
        <TextField
          variant="filled"
          label={t('settings.profile.taxId')}
          maxLength={30}
          placeholder={t('settings.profile.taxIdPlaceholder')}
          error={fieldError('taxId')}
          {...register('taxId')}
        />
        <TextField
          variant="filled"
          label={t('settings.profile.phone')}
          maxLength={30}
          type="tel"
          error={fieldError('phone')}
          {...register('phone')}
        />
        <TextField
          variant="filled"
          label={t('settings.profile.address')}
          maxLength={250}
          error={fieldError('address')}
          {...register('address')}
        />
        <TextField
          variant="filled"
          label={t('settings.profile.city')}
          maxLength={100}
          error={fieldError('city')}
          {...register('city')}
        />
        <TextField
          variant="filled"
          label={t('settings.profile.email')}
          maxLength={150}
          type="email"
          inputMode="email"
          error={fieldError('email')}
          {...register('email')}
        />
        <TextField
          variant="filled"
          label={t('settings.profile.website')}
          maxLength={150}
          inputMode="url"
          placeholder={t('settings.profile.websitePlaceholder')}
          error={fieldError('website')}
          {...register('website')}
        />
      </div>
    </SectionCard>
  );
}

interface BankAccount {
  name: string;
  number: string;
}

function parseBankAccounts(text: string): BankAccount[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf('|');
      return separator === -1
        ? { name: line, number: '' }
        : { name: line.slice(0, separator).trim(), number: line.slice(separator + 1).trim() };
    });
}

export function BankAccountsCard({ form: { register, control }, fieldError }: ProfileCardProps) {
  const { t } = useTranslation();
  const text = useWatch({ control, name: 'bankAccounts' }) ?? '';
  const accounts = parseBankAccounts(text);

  return (
    <SectionCard
      title={t('settings.sections.bankAccounts')}
      description={t('settings.profile.bankAccountsHint')}
    >
      <TextArea
        variant="filled"
        label={t('settings.profile.bankAccounts')}
        maxLength={BANK_ACCOUNTS_MAX_LENGTH}
        placeholder={t('settings.profile.bankAccountsPlaceholder')}
        error={fieldError('bankAccounts')}
        {...register('bankAccounts')}
      />
      {accounts.length > 0 ? (
        <div className="mt-4">
          <p className="text-caption font-semibold text-neutral-500 uppercase">
            {t('settings.profile.bankAccountsPreview')}
          </p>
          <ul aria-label={t('settings.profile.bankAccountsPreview')} className="mt-2 space-y-2">
            {accounts.map((account, index) => (
              <li
                key={`${index}-${account.name}`}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2"
              >
                <span className="text-body-sm font-medium text-neutral-800">{account.name}</span>
                {account.number ? (
                  <span className="font-mono text-body-sm text-primary-700">{account.number}</span>
                ) : (
                  <span className="text-caption text-warning-fg">
                    {t('settings.profile.bankAccountsMissingNumber')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function DocumentsCard({ form: { register, control }, fieldError }: ProfileCardProps) {
  const { t } = useTranslation();
  const commercialTerms = useWatch({ control, name: 'commercialTerms' }) ?? '';
  const used = commercialTerms.length / COMMERCIAL_TERMS_MAX_LENGTH;

  return (
    <SectionCard title={t('settings.sections.documents')}>
      <div className="space-y-4">
        <div>
          <TextArea
            variant="filled"
            label={t('settings.profile.commercialTerms')}
            maxLength={COMMERCIAL_TERMS_MAX_LENGTH}
            rows={4}
            hint={t('settings.profile.commercialTermsHint', {
              count: commercialTerms.length,
              max: COMMERCIAL_TERMS_MAX_LENGTH,
            })}
            error={fieldError('commercialTerms')}
            {...register('commercialTerms')}
          />
          <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-neutral-100">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${used > 0.9 ? 'bg-warning-border' : 'bg-primary-300'}`}
              style={{ width: `${Math.min(used, 1) * 100}%` }}
            />
          </div>
        </div>
        <Select
          variant="filled"
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
    </SectionCard>
  );
}
