import type { FieldErrors, FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../../shared/ui';

const SUMMARY_THRESHOLD = 3;

/** Resumen arriba del formulario cuando hay más de 3 campos con error (design system). */
export function ErrorSummary<T extends FieldValues>({ errors }: { errors: FieldErrors<T> }) {
  const { t } = useTranslation();
  const count = Object.keys(errors).length;
  if (count <= SUMMARY_THRESHOLD) return null;
  return <Alert tone="danger">{t('settings.errorSummary', { count })}</Alert>;
}
