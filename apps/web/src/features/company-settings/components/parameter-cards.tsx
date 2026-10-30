import { COMMERCIAL_PARAMETER_RANGES, VAT_RATES } from '@zentia/shared';
import { useEffect } from 'react';
import { useFormState, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SectionCard, Select, Switch, TextField } from '../../../shared/ui';
import {
  integerInput,
  percentInput,
  type ParameterField,
  type ParametersForm,
} from './settings-forms';
import { ValidityTimeline } from './validity-timeline';

interface ParameterCardProps {
  form: ParametersForm;
  fieldError: (field: ParameterField) => string | undefined;
}

export function ValidityCard({
  form: { register, control, trigger },
  fieldError,
}: ParameterCardProps) {
  const { t } = useTranslation();
  const [validityDays, expiringAlertDays, followUpDays] = useWatch({
    control,
    name: ['validityDays', 'expiringAlertDays', 'followUpDays'],
  });
  const { touchedFields } = useFormState({ control, name: 'expiringAlertDays' });

  // El máximo de X depende de N en el mismo formulario: se revalida al cambiar N.
  useEffect(() => {
    if (touchedFields.expiringAlertDays) void trigger('expiringAlertDays');
  }, [validityDays, touchedFields.expiringAlertDays, trigger]);

  const maxAlertDays = Number.isInteger(validityDays) ? validityDays - 1 : undefined;

  return (
    <SectionCard title={t('settings.sections.validity')}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            variant="filled"
            label={t('settings.parameters.validityDays')}
            type="number"
            inputMode="numeric"
            required
            min={COMMERCIAL_PARAMETER_RANGES.validityDays.min}
            max={COMMERCIAL_PARAMETER_RANGES.validityDays.max}
            hint={t('settings.parameters.validityDaysHint')}
            error={fieldError('validityDays')}
            {...register('validityDays', integerInput)}
          />
          <TextField
            variant="filled"
            label={t('settings.parameters.expiringAlertDays')}
            type="number"
            inputMode="numeric"
            required
            min={COMMERCIAL_PARAMETER_RANGES.expiringAlertDays.min}
            {...(maxAlertDays !== undefined ? { max: maxAlertDays } : {})}
            hint={t('settings.parameters.expiringAlertDaysHint', { validityDays })}
            error={fieldError('expiringAlertDays')}
            {...register('expiringAlertDays', integerInput)}
          />
          <TextField
            variant="filled"
            label={t('settings.parameters.followUpDays')}
            type="number"
            inputMode="numeric"
            required
            min={COMMERCIAL_PARAMETER_RANGES.followUpDays.min}
            max={COMMERCIAL_PARAMETER_RANGES.followUpDays.max}
            hint={t('settings.parameters.followUpDaysHint')}
            error={fieldError('followUpDays')}
            {...register('followUpDays', integerInput)}
          />
        </div>
        <ValidityTimeline
          validityDays={validityDays}
          expiringAlertDays={expiringAlertDays}
          followUpDays={followUpDays}
        />
        <TextField
          variant="filled"
          label={t('settings.parameters.coldStartThreshold')}
          type="number"
          inputMode="numeric"
          required
          min={COMMERCIAL_PARAMETER_RANGES.coldStartThreshold.min}
          max={COMMERCIAL_PARAMETER_RANGES.coldStartThreshold.max}
          hint={t('settings.parameters.coldStartThresholdHint')}
          error={fieldError('coldStartThreshold')}
          {...register('coldStartThreshold', integerInput)}
        />
      </div>
    </SectionCard>
  );
}

const DISCOUNT_FIELDS = [
  'discountLimitSeller',
  'discountLimitManager',
  'discountLimitAdmin',
] as const;

const PERCENT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

function percentWidth(value: string | undefined): string {
  const normalized = (value ?? '').trim().replace(',', '.');
  if (!PERCENT_PATTERN.test(normalized)) return '0%';
  return `${Math.min(Number(normalized), 100)}%`;
}

export function DiscountsCard({ form: { register, control }, fieldError }: ParameterCardProps) {
  const { t } = useTranslation();
  const values = useWatch({ control, name: DISCOUNT_FIELDS });

  return (
    <SectionCard
      title={t('settings.sections.discounts')}
      description={t('settings.parameters.discountHint')}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {DISCOUNT_FIELDS.map((field, index) => (
          <div key={field}>
            <TextField
              variant="filled"
              label={t(`settings.parameters.${field}`)}
              inputMode="decimal"
              required
              endAdornment={<span className="px-2 text-body text-neutral-500">%</span>}
              error={fieldError(field)}
              {...register(field, percentInput)}
            />
            <div
              aria-hidden="true"
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100"
            >
              <div
                className="h-full rounded-full bg-primary-500 transition-[width] duration-200"
                style={{ width: percentWidth(values[index]) }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function TaxesCard({ form: { register }, fieldError }: ParameterCardProps) {
  const { t } = useTranslation();

  return (
    <SectionCard title={t('settings.sections.taxes')}>
      <div className="space-y-5">
        <Select
          variant="filled"
          label={t('settings.parameters.defaultVatRate')}
          required
          hint={t('settings.parameters.defaultVatRateHint')}
          options={VAT_RATES.map((rate) => ({ value: rate, label: t(`enums.VatRate.${rate}`) }))}
          error={fieldError('defaultVatRate')}
          {...register('defaultVatRate')}
        />
        <Switch
          label={t('settings.parameters.shippingTaxable')}
          hint={t('settings.parameters.shippingTaxableHint')}
          className="rounded-lg bg-neutral-50 p-3"
          {...register('shippingTaxable')}
        />
      </div>
    </SectionCard>
  );
}
