import { zodResolver } from '@hookform/resolvers/zod';
import {
  emailSchema,
  ROLES,
  roleSchema,
  userNameSchema,
  type CreateUserResult,
  type UserDto,
} from '@zentia/shared';
import { useState } from 'react';
import { useForm, type FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { errorKey, isApiError } from '../../../core/errors';
import { Alert, Button, Dialog, Select, Switch, TextField } from '../../../shared/ui';
import { usersService } from '../services/users.service';

const formSchema = z.object({
  name: userNameSchema,
  email: emailSchema,
  role: roleSchema,
  isActive: z.boolean(),
});

type UserFormInput = z.input<typeof formSchema>;
type UserFormValues = z.output<typeof formSchema>;

function fieldErrorKey(error: FieldError | undefined, field: keyof UserFormInput) {
  if (!error) return undefined;
  if (error.message?.startsWith('errors.') || error.message?.startsWith('validation.')) {
    return error.message;
  }
  if (field === 'email') return 'validation.email';
  if (error.type === 'too_small') return 'validation.required';
  return error.type === 'too_big' ? 'validation.too_big' : 'validation.invalid_value';
}

type UserFormDialogProps = {
  currentUserId: string | undefined;
  onClose: () => void;
} & (
  | { mode: 'create'; onCreated: (result: CreateUserResult) => void }
  | { mode: 'edit'; user: UserDto; onUpdated: (user: UserDto) => void }
);

export function UserFormDialog(props: UserFormDialogProps) {
  const { t } = useTranslation();
  const editing = props.mode === 'edit' ? props.user : undefined;
  const isSelf = editing !== undefined && editing.id === props.currentUserId;
  const [serverError, setServerError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserFormInput, unknown, UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: editing?.name ?? '',
      email: editing?.email ?? '',
      role: editing?.role ?? 'SELLER',
      isActive: editing?.isActive ?? true,
    },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (props.mode === 'create') {
        props.onCreated(
          await usersService.create({ name: values.name, email: values.email, role: values.role }),
        );
      } else {
        props.onUpdated(
          await usersService.update(
            props.user.id,
            isSelf ? { name: values.name, email: values.email } : values,
          ),
        );
      }
    } catch (error) {
      if (isApiError(error) && error.code === 'EMAIL_TAKEN') {
        setError('email', { message: 'errors.EMAIL_TAKEN' });
      } else {
        setServerError(error);
      }
    }
  });

  const message = (field: keyof UserFormInput) => {
    const key = fieldErrorKey(errors[field], field);
    return key ? t(key) : undefined;
  };

  const roleOptions = ROLES.map((role) => ({ value: role, label: t(`enums.Role.${role}`) }));
  const formId = editing ? `user-form-${editing.id}` : 'user-form-new';

  return (
    <Dialog
      size="md"
      title={editing ? t('users.edit') : t('users.new')}
      onClose={props.onClose}
      closeLabel={t('common.close')}
      dismissible={!isDirty}
      footer={
        <>
          <Button variant="secondary" onClick={props.onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            {editing ? t('users.form.save') : t('users.form.create')}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <TextField
          label={t('users.form.name')}
          required
          autoComplete="off"
          maxLength={100}
          error={message('name')}
          {...register('name')}
        />
        <TextField
          label={t('users.form.email')}
          type="email"
          required
          autoComplete="off"
          error={message('email')}
          {...register('email')}
        />
        <Select
          label={t('users.form.role')}
          required
          options={roleOptions}
          disabled={isSelf}
          hint={isSelf ? t('users.form.selfReadonlyHint') : undefined}
          error={message('role')}
          {...register('role')}
        />
        {editing ? (
          <Switch
            label={t('users.form.active')}
            hint={isSelf ? t('users.form.selfReadonlyHint') : t('users.form.activeHint')}
            disabled={isSelf}
            {...register('isActive')}
          />
        ) : null}
        {serverError ? <Alert tone="danger">{t(errorKey(serverError))}</Alert> : null}
      </form>
    </Dialog>
  );
}
