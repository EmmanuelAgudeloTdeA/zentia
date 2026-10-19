import { checkPasswordPolicy, type PasswordRule } from '@zentia/shared';
import { useTranslation } from 'react-i18next';
import { CheckIcon, CircleIcon } from '../../../shared/ui';

const RULES: readonly PasswordRule[] = ['length', 'letterAndNumber', 'notEmail'];

interface PasswordRequirementsProps {
  id: string;
  password: string;
  email: string;
}

export function PasswordRequirements({ id, password, email }: PasswordRequirementsProps) {
  const { t } = useTranslation();
  const failed = new Set(checkPasswordPolicy(password, email));

  return (
    <ul id={id} className="mt-2 grid gap-1.5 sm:grid-cols-3">
      {RULES.map((rule) => {
        const met = password.length > 0 && !failed.has(rule);
        return (
          <li
            key={rule}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-caption ${
              met ? 'bg-success-bg text-success-fg' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {met ? <CheckIcon size={14} /> : <CircleIcon size={14} />}
            <span>{t(`auth.passwordPolicy.${rule}`)}</span>
            <span className="sr-only">
              {t(met ? 'auth.passwordPolicy.met' : 'auth.passwordPolicy.pending')}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
