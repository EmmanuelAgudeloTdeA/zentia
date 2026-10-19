import { zodResolver } from '@hookform/resolvers/zod';
import { checkPasswordPolicy } from '@zentia/shared';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { useSessionStore } from '../../../core/auth';
import { errorKey, isApiError } from '../../../core/errors';
import { PageHeader } from '../../../core/layout';
import { Alert, Button, PasswordField, toast } from '../../../shared/ui';
import { changePassword } from '../services/session.service';
import { PasswordRequirements } from './password-requirements';

function createSchema(email: string) {
  return z
    .object({
      currentPassword: z.string().min(1, 'validation.required'),
      newPassword: z.string().min(1, 'validation.required'),
      confirmPassword: z.string().min(1, 'validation.required'),
    })
    .superRefine((values, ctx) => {
      if (values.newPassword && checkPasswordPolicy(values.newPassword, email).length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['newPassword'],
          message: 'validation.password.policy',
        });
      }
      if (values.confirmPassword && values.confirmPassword !== values.newPassword) {
        ctx.addIssue({
          code: 'custom',
          path: ['confirmPassword'],
          message: 'validation.password.mismatch',
        });
      }
    });
}

type ChangePasswordForm = z.infer<ReturnType<typeof createSchema>>;

const FIELD_ERRORS = {
  INVALID_CURRENT_PASSWORD: 'currentPassword',
  PASSWORD_REUSED: 'newPassword',
  VALIDATION_ERROR: 'newPassword',
} as const;

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const email = useSessionStore((state) => state.user?.email ?? '');
  const forced = useSessionStore((state) => state.user?.mustChangePassword ?? false);
  const [serverError, setServerError] = useState<string | null>(null);
  const schema = useMemo(() => createSchema(email), [email]);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(schema), mode: 'onTouched' });
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword: next }) => {
    setServerError(null);
    try {
      await changePassword({ currentPassword, newPassword: next });
      toast.success(t('auth.changePassword.success'));
      navigate('/', { replace: true });
    } catch (error) {
      const field =
        isApiError(error) && error.code in FIELD_ERRORS
          ? FIELD_ERRORS[error.code as keyof typeof FIELD_ERRORS]
          : null;
      if (field && isApiError(error)) {
        setError(field, {
          message:
            error.code === 'VALIDATION_ERROR' ? 'validation.password.policy' : errorKey(error),
        });
      } else {
        setServerError(errorKey(error));
      }
    }
  });

  const fieldError = (message: string | undefined) => (message ? t(message) : undefined);

  return (
    <>
      <PageHeader title={t('auth.changePassword.title')} {...(forced ? {} : { backTo: '/' })} />
      <section className="mx-auto max-w-xl rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-sm sm:p-8">
        <h2 className="border-l-3 border-primary-600 pl-3 text-overline text-neutral-500 uppercase">
          {t('auth.changePassword.section')}
        </h2>

        <form noValidate onSubmit={onSubmit} className="mt-6 space-y-5">
          {forced ? (
            <Alert tone="warning" title={t('auth.changePassword.forcedTitle')}>
              {t('auth.changePassword.forcedNotice')}
            </Alert>
          ) : null}
          {serverError ? <Alert tone="danger">{t(serverError)}</Alert> : null}

          <PasswordField
            label={t('auth.changePassword.current')}
            autoComplete="current-password"
            required
            showLabel={t('auth.password.show')}
            hideLabel={t('auth.password.hide')}
            error={fieldError(errors.currentPassword?.message)}
            {...register('currentPassword')}
          />
          <div>
            <PasswordField
              label={t('auth.changePassword.new')}
              autoComplete="new-password"
              required
              showLabel={t('auth.password.show')}
              hideLabel={t('auth.password.hide')}
              hint={t('auth.passwordPolicy.hint')}
              error={fieldError(errors.newPassword?.message)}
              {...register('newPassword')}
            />
            <PasswordRequirements id="password-requirements" password={newPassword} email={email} />
          </div>
          <PasswordField
            label={t('auth.changePassword.confirm')}
            autoComplete="new-password"
            required
            showLabel={t('auth.password.show')}
            hideLabel={t('auth.password.hide')}
            error={fieldError(errors.confirmPassword?.message)}
            {...register('confirmPassword')}
          />

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            {forced ? null : (
              <Button variant="secondary" onClick={() => navigate('/')}>
                {t('common.cancel')}
              </Button>
            )}
            <Button type="submit" loading={isSubmitting}>
              {t('auth.changePassword.submit')}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
