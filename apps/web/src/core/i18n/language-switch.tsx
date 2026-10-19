import { LOCALES } from '@zentia/shared';
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from './locale.store';

interface LanguageSwitchProps {
  tone?: 'dark' | 'light';
}

const TONE_CLASSES = {
  dark: {
    group: 'bg-white/10',
    active: 'bg-neutral-0 text-primary-900',
    idle: 'text-white/80 hover:text-white',
  },
  light: {
    group: 'bg-neutral-100',
    active: 'bg-neutral-0 text-primary-700 shadow-xs',
    idle: 'text-neutral-600 hover:text-neutral-900',
  },
} as const;

export function LanguageSwitch({ tone = 'dark' }: LanguageSwitchProps) {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const classes = TONE_CLASSES[tone];

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={`inline-flex rounded-full p-0.5 ${classes.group}`}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={locale === option}
          aria-label={t(`language.${option}`)}
          onClick={() => setLocale(option)}
          className={`min-w-10 rounded-full px-2.5 py-1 text-caption font-semibold transition-colors duration-150 ${
            locale === option ? classes.active : classes.idle
          }`}
        >
          {t(`language.short.${option}`)}
        </button>
      ))}
    </div>
  );
}
