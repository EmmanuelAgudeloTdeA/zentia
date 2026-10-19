import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate, type Location } from 'react-router';
import { z } from 'zod';
import { CHANGE_PASSWORD_PATH, useSessionStore } from '../../../core/auth';
import { errorKey } from '../../../core/errors';
import { Alert, ArrowRightIcon, Button, PasswordField, TextField } from '../../../shared/ui';
import { login } from '../services/session.service';

const loginFormSchema = z.object({
  email: z.string().trim().min(1, 'validation.required').pipe(z.email('validation.email')),
  password: z.string().min(1, 'validation.required'),
});

type LoginForm = z.infer<typeof loginFormSchema>;

function targetFrom(state: unknown): string {
  const from = (state as { from?: Partial<Location> } | null)?.from;
  return from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/';
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const status = useSessionStore((state) => state.status);
  const mustChangePassword = useSessionStore((state) => state.user?.mustChangePassword);
  const notice = useSessionStore((state) => state.notice);
  const clearNotice = useSessionStore((state) => state.clearNotice);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginFormSchema), mode: 'onTouched' });

  if (status === 'authenticated') {
    return (
      <Navigate
        to={mustChangePassword ? CHANGE_PASSWORD_PATH : targetFrom(location.state)}
        replace
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    clearNotice();
    try {
      const user = await login(values);
      navigate(user.mustChangePassword ? CHANGE_PASSWORD_PATH : targetFrom(location.state), {
        replace: true,
      });
    } catch (error) {
      setServerError(errorKey(error));
    }
  });

  return (
    <div className="mt-5 text-center">
      <h1 className="text-h1 text-neutral-900">{t('auth.login.title')}</h1>
      <p className="mt-1 text-body text-neutral-600">{t('auth.login.subtitle')}</p>

      <form noValidate onSubmit={onSubmit} className="mt-6 space-y-4 text-left">
        {notice === 'sessionExpired' && !serverError ? (
          <Alert tone="info">{t('auth.login.sessionExpired')}</Alert>
        ) : null}
        {serverError ? (
          <Alert tone="danger" onClose={() => setServerError(null)} closeLabel={t('common.close')}>
            {t(serverError)}
          </Alert>
        ) : null}

        <TextField
          label={t('auth.login.email')}
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder={t('auth.login.emailPlaceholder')}
          required
          error={errors.email?.message ? t(errors.email.message) : undefined}
          {...register('email')}
        />
        <PasswordField
          label={t('auth.login.password')}
          autoComplete="current-password"
          required
          showLabel={t('auth.password.show')}
          hideLabel={t('auth.password.hide')}
          error={errors.password?.message ? t(errors.password.message) : undefined}
          {...register('password')}
        />

        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="w-full"
          icon={<ArrowRightIcon size={16} />}
        >
          {t('auth.login.submit')}
        </Button>
      </form>

      <p className="mt-6 text-caption text-neutral-600">{t('auth.login.forgotHint')}</p>
    </div>
  );
}
