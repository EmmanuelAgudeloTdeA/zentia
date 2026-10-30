import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Skeleton } from '../../shared/ui';
import { logoUrl, useBrandingStore } from '../branding';

interface BrandLogoProps {
  size?: 'md' | 'lg';
}

/** Nombre de la empresa o, mientras esté vacío, el de la app. */
export function useBrandName(): string {
  const { t } = useTranslation();
  const name = useBrandingStore((state) => state.name);
  return name?.trim() ? name : t('app.name');
}

export function BrandLogo({ size = 'md' }: BrandLogoProps) {
  const brandName = useBrandName();
  const status = useBrandingStore((state) => state.status);
  const hasLogo = useBrandingStore((state) => state.hasLogo);
  const logoVersion = useBrandingStore((state) => state.logoVersion);
  const [failedVersion, setFailedVersion] = useState<number | null>(null);
  const dimensions = size === 'lg' ? 'size-16 text-h1' : 'size-10 text-h2';
  const circle = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-0 font-bold text-primary-600 shadow-sm ring-4 ring-white/20 ${dimensions}`;

  if (status === 'loading') {
    return (
      <span aria-hidden="true" className={circle}>
        <Skeleton className="size-full rounded-full" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={circle}>
      {hasLogo && failedVersion !== logoVersion ? (
        <img
          src={logoUrl(logoVersion)}
          alt=""
          className="size-full object-contain p-1"
          onError={() => setFailedVersion(logoVersion)}
        />
      ) : (
        brandName.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function BrandMark() {
  const brandName = useBrandName();

  return (
    <Link to="/" className="flex min-w-0 items-center gap-3 rounded-md text-white">
      <BrandLogo />
      <span className="truncate text-h3">{brandName}</span>
    </Link>
  );
}
