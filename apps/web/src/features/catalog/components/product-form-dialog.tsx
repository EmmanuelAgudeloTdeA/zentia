import { zodResolver } from '@hookform/resolvers/zod';
import {
  CATEGORY_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  VAT_RATES,
  vatRateSchema,
  type ProductDto,
} from '@zentia/shared';
import { useEffect, useState } from 'react';
import { Controller, useForm, type FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { errorKey } from '../../../core/errors';
import { Alert, Button, Dialog, MoneyField, Select, TextField } from '../../../shared/ui';
import { FALLBACK_VAT_RATE, useDefaultVatRate } from '../hooks/use-default-vat-rate';
import { productsService } from '../services/products.service';
import { CategoryCombobox } from './category-combobox';

const formSchema = z.object({
  name: z.string().trim().min(1).max(PRODUCT_NAME_MAX_LENGTH),
  category: z.string().trim().min(1).max(CATEGORY_MAX_LENGTH),
  price: z
    .string()
    .min(1, 'validation.required')
    .regex(/^[1-9]\d{0,14}$/, 'validation.price.positive'),
  vatRate: vatRateSchema,
});

type FormValues = z.infer<typeof formSchema>;

function fieldErrorKey(error: FieldError | undefined): string | undefined {
  if (!error) return undefined;
  if (error.message?.startsWith('validation.')) return error.message;
  return error.type === 'too_small' ? 'validation.required' : 'validation.too_big';
}

interface ProductFormDialogProps {
  product?: ProductDto;
  onClose: () => void;
  onSaved: (product: ProductDto) => void;
}

export function ProductFormDialog({ product, onClose, onSaved }: ProductFormDialogProps) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<unknown>(null);
  const defaultVatRate = useDefaultVatRate(!product);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getFieldState,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name ?? '',
      category: product?.category ?? '',
      price: product?.price ?? '',
      vatRate: product?.vatRate ?? FALLBACK_VAT_RATE,
    },
  });

  useEffect(() => {
    if (defaultVatRate && !getFieldState('vatRate').isDirty) setValue('vatRate', defaultVatRate);
  }, [defaultVatRate, getFieldState, setValue]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      onSaved(
        product
          ? await productsService.update(product.id, values)
          : await productsService.create(values),
      );
    } catch (error) {
      setServerError(error);
    }
  });

  const message = (field: keyof FormValues) => {
    const key = fieldErrorKey(errors[field]);
    return key ? t(key) : undefined;
  };
  const formId = product ? `product-form-${product.id}` : 'product-form-new';

  return (
    <Dialog
      size="md"
      title={product ? t('products.edit') : t('products.new')}
      onClose={onClose}
      closeLabel={t('common.close')}
      dismissible={!isDirty}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            {product ? t('products.form.save') : t('products.form.create')}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <TextField
          label={t('products.fields.name')}
          required
          autoComplete="off"
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          error={message('name')}
          {...register('name')}
        />
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategoryCombobox
              label={t('products.fields.category')}
              required
              allowCreate
              value={field.value}
              onChange={field.onChange}
              onSelect={field.onChange}
              onBlur={field.onBlur}
              error={message('category')}
            />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="price"
            render={({ field }) => (
              <MoneyField
                label={t('products.fields.price')}
                required
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                hint={t('products.priceHint')}
                error={message('price')}
              />
            )}
          />
          <Select
            label={t('products.fields.vatRate')}
            required
            options={VAT_RATES.map((rate) => ({ value: rate, label: t(`enums.VatRate.${rate}`) }))}
            error={message('vatRate')}
            {...register('vatRate')}
          />
        </div>
        {product ? <Alert tone="info">{t('products.snapshotNotice')}</Alert> : null}
        {serverError ? <Alert tone="danger">{t(errorKey(serverError))}</Alert> : null}
      </form>
    </Dialog>
  );
}
