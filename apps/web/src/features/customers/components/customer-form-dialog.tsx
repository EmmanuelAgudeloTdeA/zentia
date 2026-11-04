import { zodResolver } from '@hookform/resolvers/zod';
import {
  CUSTOMER_NAME_MAX_LENGTH,
  customerEmailSchema,
  DOCUMENT_ID_LENGTH,
  documentIdSchema,
  formatPhoneForDisplay,
  normalizeDocumentId,
  normalizePhone,
  type CustomerDto,
} from '@zentia/shared';
import { useState } from 'react';
import { useForm, useWatch, type FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { errorKey, isApiError } from '../../../core/errors';
import { Alert, Button, Dialog, TextField } from '../../../shared/ui';
import { customersService } from '../services/customers.service';

const CONTACT_REQUIRED = 'errors.CUSTOMER_CONTACT_REQUIRED';

const formSchema = z
  .object({
    name: z.string().trim().min(1).max(CUSTOMER_NAME_MAX_LENGTH),
    documentId: documentIdSchema,
    phone: z.string().trim().max(30),
    email: customerEmailSchema,
  })
  .superRefine((values, ctx) => {
    if (values.phone && !normalizePhone(values.phone)) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'errors.INVALID_PHONE' });
    }
    if (!values.phone && !values.email) {
      ctx.addIssue({ code: 'custom', path: ['phone'], message: CONTACT_REQUIRED });
    }
  });

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;
type Field = keyof FormInput;

const FIELD_ERRORS: Partial<Record<string, Field>> = {
  CUSTOMER_DOCUMENT_TAKEN: 'documentId',
  INVALID_PHONE: 'phone',
  CUSTOMER_CONTACT_REQUIRED: 'phone',
};

function fieldErrorKey(error: FieldError | undefined, field: Field): string | undefined {
  if (!error) return undefined;
  if (error.message?.startsWith('errors.')) return error.message;
  if (field === 'email') return 'validation.email';
  if (field === 'documentId')
    return error.type === 'too_small' ? 'validation.too_small' : 'validation.too_big';
  return error.type === 'too_small' ? 'validation.required' : 'validation.too_big';
}

interface DuplicateHint {
  id: string;
  name: string;
}

interface CustomerFormDialogProps {
  customer?: CustomerDto;
  onClose: () => void;
  onSaved: (customer: CustomerDto) => void;
  onOpenExisting: (id: string) => void;
}

export function CustomerFormDialog({
  customer,
  onClose,
  onSaved,
  onOpenExisting,
}: CustomerFormDialogProps) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<unknown>(null);
  const [duplicate, setDuplicate] = useState<DuplicateHint | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: customer?.name ?? '',
      documentId: customer?.documentId ?? '',
      phone: customer?.phone ? formatPhoneForDisplay(customer.phone) : '',
      email: customer?.email ?? '',
    },
  });
  const [phone, documentId] = useWatch({ control, name: ['phone', 'documentId'] });
  const normalizedPhone = phone ? normalizePhone(phone) : null;
  const normalizedDocument = normalizeDocumentId(documentId);

  const checkDuplicate = async () => {
    setDuplicate(null);
    if (normalizedDocument.length < DOCUMENT_ID_LENGTH.min) return;
    try {
      const { items } = await customersService.documentMatches(normalizedDocument);
      const match = items.find((item) => item.id !== customer?.id);
      if (match) setDuplicate({ id: match.id, name: match.name });
    } catch {
      // El aviso de duplicados es una ayuda; el back valida el documento al guardar.
    }
  };

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const body = {
      name: values.name,
      documentId: values.documentId,
      phone: values.phone || null,
      email: values.email,
    };
    try {
      onSaved(
        customer
          ? await customersService.update(customer.id, body)
          : await customersService.create(body),
      );
    } catch (error) {
      const field = isApiError(error) ? FIELD_ERRORS[error.code] : undefined;
      if (field && isApiError(error)) setError(field, { message: `errors.${error.code}` });
      else setServerError(error);
    }
  });

  const message = (field: Field) => {
    const key = fieldErrorKey(errors[field], field);
    return key ? t(key) : undefined;
  };
  const contactMissing = errors.phone?.message === CONTACT_REQUIRED;
  const formId = customer ? `customer-form-${customer.id}` : 'customer-form-new';

  return (
    <Dialog
      size="md"
      title={customer ? t('customers.edit') : t('customers.new')}
      onClose={onClose}
      closeLabel={t('common.close')}
      dismissible={!isDirty}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            {customer ? t('customers.form.save') : t('customers.form.create')}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <TextField
          label={t('customers.fields.name')}
          required
          autoComplete="off"
          maxLength={CUSTOMER_NAME_MAX_LENGTH}
          error={message('name')}
          {...register('name')}
        />
        <TextField
          label={t('customers.fields.documentId')}
          required
          autoComplete="off"
          error={message('documentId')}
          hint={
            normalizedDocument && normalizedDocument !== documentId.trim()
              ? t('customers.documentPreview', { documentId: normalizedDocument })
              : undefined
          }
          {...register('documentId', { onBlur: () => void checkDuplicate() })}
        />
        {duplicate ? (
          <Alert
            tone="warning"
            action={
              <Button variant="secondary" size="sm" onClick={() => onOpenExisting(duplicate.id)}>
                {t('customers.openExisting')}
              </Button>
            }
          >
            {t('customers.duplicateFound', { name: duplicate.name })}
          </Alert>
        ) : null}

        <fieldset className="space-y-4">
          <legend
            className={`text-body-sm ${contactMissing ? 'font-medium text-danger-fg' : 'text-neutral-600'}`}
          >
            {t('customers.contactHint')}
          </legend>
          <TextField
            label={t('customers.fields.phone')}
            type="tel"
            autoComplete="off"
            error={contactMissing ? undefined : message('phone')}
            aria-invalid={contactMissing || undefined}
            hint={
              normalizedPhone
                ? t('customers.phonePreview', { phone: formatPhoneForDisplay(normalizedPhone) })
                : t('customers.phoneHint')
            }
            {...register('phone')}
          />
          <TextField
            label={t('customers.fields.email')}
            type="email"
            autoComplete="off"
            error={message('email')}
            aria-invalid={contactMissing || undefined}
            {...register('email')}
          />
        </fieldset>
        {serverError ? <Alert tone="danger">{t(errorKey(serverError))}</Alert> : null}
      </form>
    </Dialog>
  );
}
