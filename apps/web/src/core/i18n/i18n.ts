import { DEFAULT_LOCALE } from '@zentia/shared';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../lang/en.json';
import es from '../../lang/es.json';
import { useLocaleStore } from './locale.store';

function applyDocumentLanguage(locale: string): void {
  document.documentElement.lang = locale;
}

export function initI18n(): typeof i18next {
  const { locale } = useLocaleStore.getState();

  void i18next.use(initReactI18next).init({
    resources: { es: { translation: es }, en: { translation: en } },
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
  });
  applyDocumentLanguage(locale);

  useLocaleStore.subscribe(({ locale: next }) => {
    void i18next.changeLanguage(next);
    applyDocumentLanguage(next);
  });

  return i18next;
}
