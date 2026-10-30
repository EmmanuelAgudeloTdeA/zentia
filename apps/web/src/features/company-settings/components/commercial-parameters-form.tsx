import { zodResolver } from '@hookform/resolvers/zod';
import {
  commercialParametersSchema,
  COMMERCIAL_PARAMETER_RANGES,
  EXPIRING_ALERT_DAYS_LT_VALIDITY,
  VAT_RATES,
  type CommercialParameters,
  type CompanySettingsDto,
} from '@zentia/shared';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { errorKey } from '../../../core/errors';
import { Alert, Button, SectionCard, Select, Switch, TextField, toast } from '../../../shared/ui';
import { companyService } from '../services/company.service';
import { applyServerIssues, fieldErrorKey } from './field-errors';

type ParameterField = keyof CommercialParameters;

const PARAMETER_FIELDS: readonly ParameterField[] = [
  'defaultVatRate',
  'validityDays',
  'discountLimitSeller',
  'discountLimitManager',
  'discountLimitAdmin',
  'shippingTaxable',
  'expiringAlertDays',
  'followUpDays',
  'coldStartThreshold',
];

const DISCOUNT_FIELDS = [
  'discountLimitSeller',
  'discountLimitManager',
  'discountLimitAdmin',
] as const;

function toFormValues(settings: CompanySettingsDto): CommercialParameters {
  return {
    defaultVatRate: settings.defaultVatRate,
    validityDays: settings.validityDays,
    discountLimitSeller: settings.discountLimitSeller,
    discountLimitManager: settings.discountLimitManager,
    discountLimitAdmin: settings.discountLimitAdmin,
    shippingTaxable: settings.shippingTaxable,
    expiringAlertDays: settings.expiringAlertDays,
    followUpDays: settings.followUpDays,
    coldStartThreshold: settings.coldStartThreshold,
  };
}

const integer = { setValueAs: (value: string) => (value === '' ? Number.NaN : Number(value)) };
const percent = { setValueAs: (value: string) => value.trim().replace(',', '.') };

interface CommercialParametersFormProps {
  settings: CompanySettingsDto;
  onSaved: (settings: CompanySettingsDto) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function CommercialParametersForm({
  settings,
  onSaved,
  onDirtyChange,
}: CommercialParametersFormProps) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    trigger,
    formState: { errors, isSubmitting, isDirty, touchedFields },
  } = useForm<CommercialParameters>({
    resolver: zodResolver(commercialParametersSchema),
    mode: 'onTouched',
    defaultValues: toFormValues(settings),
  });
  const validityDays = useWatch({ control, name: 'validityDays' });

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  // El máximo de X depende de N en el mismo formulario: se revalida al cambiar N.
  useEffect(() => {
    if (touchedFields.expiringAlertDays) void trigger('expiringAlertDays');
  }, [validityDays, touchedFields.expiringAlertDays, trigger]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const saved = await companyService.updateParameters(values);
      reset(toFormValues(saved));
      onSaved(saved);
      toast.success(t('settings.parameters.saved'));
    } catch (error) {
      const placed = applyServerIssues(error, setError, PARAMETER_FIELDS, {
        expiringAlertDays: EXPIRING_ALERT_DAYS_LT_VALIDITY,
      });
      if (!placed) setServerError(errorKey(error));
    }
  });

  const fieldError = (key: ParameterField) => {
    const messageKey = fieldErrorKey(errors[key]);
    return messageKey ? t(messageKey, { validityDays }) : undefined;
  };

  const maxAlertDays = Number.isInteger(validityDays) ? validityDays - 1 : undefined;

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
      <Alert tone="info">{t('settings.parameters.futureOnlyNotice')}</Alert>
      {serverError ? <Alert tone="danger">{t(serverError)}</Alert> : null}

      <SectionCard title={t('settings.parameters.sections.quotes')}>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label={t('settings.parameters.validityDays')}
            type="number"
            inputMode="numeric"
            required
            min={COMMERCIAL_PARAMETER_RANGES.validityDays.min}
            max={COMMERCIAL_PARAMETER_RANGES.validityDays.max}
            hint={t('settings.parameters.validityDaysHint')}
            error={fieldError('validityDays')}
            {...register('validityDays', integer)}
          />
          <Select
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
            className="md:col-span-2"
            {...register('shippingTaxable')}
          />
        </div>
      </SectionCard>

      <SectionCard title={t('settings.parameters.sections.discounts')}>
        <div className="grid gap-5 md:grid-cols-3">
          {DISCOUNT_FIELDS.map((field) => (
            <TextField
              key={field}
              label={t(`settings.parameters.${field}`)}
              inputMode="decimal"
              required
              hint={t('settings.parameters.discountHint')}
              endAdornment={<span className="px-2 text-body text-neutral-500">%</span>}
              error={fieldError(field)}
              {...register(field, percent)}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t('settings.parameters.sections.followUp')}>
        <div className="grid gap-5 md:grid-cols-3">
          <TextField
            label={t('settings.parameters.expiringAlertDays')}
            type="number"
            inputMode="numeric"
            required
            min={COMMERCIAL_PARAMETER_RANGES.expiringAlertDays.min}
            {...(maxAlertDays !== undefined ? { max: maxAlertDays } : {})}
            hint={t('settings.parameters.expiringAlertDaysHint', { validityDays })}
            error={fieldError('expiringAlertDays')}
            {...register('expiringAlertDays', integer)}
          />
          <TextField
            label={t('settings.parameters.followUpDays')}
            type="number"
            inputMode="numeric"
            required
            min={COMMERCIAL_PARAMETER_RANGES.followUpDays.min}
            max={COMMERCIAL_PARAMETER_RANGES.followUpDays.max}
            hint={t('settings.parameters.followUpDaysHint')}
            error={fieldError('followUpDays')}
            {...register('followUpDays', integer)}
          />
          <TextField
            label={t('settings.parameters.coldStartThreshold')}
            type="number"
            inputMode="numeric"
            required
            min={COMMERCIAL_PARAMETER_RANGES.coldStartThreshold.min}
            max={COMMERCIAL_PARAMETER_RANGES.coldStartThreshold.max}
            hint={t('settings.parameters.coldStartThresholdHint')}
            error={fieldError('coldStartThreshold')}
            {...register('coldStartThreshold', integer)}
          />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          {t('settings.parameters.submit')}
        </Button>
      </div>
    </form>
  );
}
