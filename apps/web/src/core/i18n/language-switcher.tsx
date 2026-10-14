import { LOCALES, localeSchema } from '@zentia/shared';
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from './locale.store';

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span>{t('language.label')}</span>
      <select
        className="rounded border border-slate-300 bg-white px-2 py-1"
        value={locale}
        onChange={(event) => setLocale(localeSchema.parse(event.target.value))}
      >
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {t(`language.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
