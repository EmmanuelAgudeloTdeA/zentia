import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface BrandLogoProps {
  size?: 'md' | 'lg';
}

// M2 (S2.1.4) reemplaza la inicial por el logo y el nombre de la empresa.
export function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const { t } = useTranslation();
  const dimensions = size === 'lg' ? 'size-16 text-h1' : 'size-10 text-h2';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-neutral-0 font-bold text-primary-600 shadow-sm ring-4 ring-white/20 ${dimensions}`}
    >
      {t('app.name').charAt(0)}
    </span>
  );
}

export function BrandMark() {
  const { t } = useTranslation();

  return (
    <Link to="/" className="flex min-w-0 items-center gap-3 rounded-md text-white">
      <BrandLogo />
      <span className="truncate text-h3">{t('app.name')}</span>
    </Link>
  );
}
