import { LOGO_MAX_BYTES, LOGO_MIME_TYPES, type LogoMimeType } from '@zentia/shared';
import { useId, useRef, useState, type DragEvent } from 'react';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { logoUrl, useBrandingStore } from '../../../core/branding';
import { errorKey } from '../../../core/errors';
import {
  Alert,
  AlertCircleIcon,
  Button,
  ConfirmDialog,
  SectionCard,
  toast,
  TrashIcon,
  UploadIcon,
  ZentiaMark,
} from '../../../shared/ui';
import { companyService } from '../services/company.service';
import type { ProfileForm } from './settings-forms';

export interface PendingLogo {
  mimeType: LogoMimeType;
  dataUrl: string;
}

function isLogoMimeType(value: string): value is LogoMimeType {
  return (LOGO_MIME_TYPES as readonly string[]).includes(value);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

interface BrandCardProps {
  profile: ProfileForm;
  pending: PendingLogo | null;
  onPendingChange: (logo: PendingLogo | null) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
}

export function BrandCard({
  profile,
  pending,
  onPendingChange,
  error,
  onErrorChange,
}: BrandCardProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasLogo = useBrandingStore((state) => state.hasLogo);
  const logoVersion = useBrandingStore((state) => state.logoVersion);
  const setBranding = useBrandingStore((state) => state.setBranding);
  const [dragging, setDragging] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [name, taxId, city, phone, website] = useWatch({
    control: profile.control,
    name: ['name', 'taxId', 'city', 'phone', 'website'],
  });

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    onErrorChange(null);
    if (!isLogoMimeType(file.type)) {
      onErrorChange('errors.LOGO_INVALID_TYPE');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      onErrorChange('errors.LOGO_TOO_LARGE');
      return;
    }
    onPendingChange({ mimeType: file.type, dataUrl: await readAsDataUrl(file) });
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    void pickFile(event.dataTransfer.files[0]);
  };

  const onRemove = async () => {
    setRemoving(true);
    setRemoveError(null);
    try {
      await companyService.deleteLogo();
      setBranding({ hasLogo: false, logoVersion: logoVersion + 1 });
      setConfirmingRemove(false);
      toast.success(t('settings.logo.removed'));
    } catch (deleteError) {
      setRemoveError(errorKey(deleteError));
    } finally {
      setRemoving(false);
    }
  };

  const previewSrc = pending?.dataUrl ?? (hasLogo ? logoUrl(logoVersion) : null);
  const displayName = name?.trim() || t('app.name');
  const details = [taxId && `${t('settings.profile.taxId')} ${taxId}`, city, phone, website]
    .map((value) => value?.trim())
    .filter(Boolean);

  const logoImage = previewSrc ? (
    <img
      src={previewSrc}
      alt={t('settings.logo.current')}
      className="size-full object-contain p-2"
    />
  ) : (
    <ZentiaMark className="size-3/4" />
  );

  const picker = (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-label={pending ? t('settings.logo.preview') : t('settings.logo.dropzone')}
        aria-describedby={`${inputId}-hint`}
        className={`group relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-0 transition-shadow duration-150 size-20 ring-4 ${
          dragging ? 'ring-primary-300' : 'ring-white/25 hover:ring-white/50'
        }`}
      >
        {logoImage}
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center rounded-full bg-primary-900/55 text-white transition-opacity duration-150 ${
            dragging
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
          }`}
        >
          <UploadIcon size={20} />
        </span>
      </button>
      <span id={`${inputId}-hint`} className="sr-only">
        {t('settings.logo.hint')}
      </span>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={LOGO_MIME_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-describedby={`${inputId}-hint`}
        aria-label={t(hasLogo ? 'settings.logo.change' : 'settings.logo.upload')}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          void pickFile(file);
        }}
      />
    </>
  );

  const actions =
    pending || hasLogo ? (
      pending ? (
        <Button variant="ghost-on-dark" size="sm" onClick={() => onPendingChange(null)}>
          {t('settings.logo.cancelPending')}
        </Button>
      ) : (
        <Button
          variant="ghost-on-dark"
          size="sm"
          icon={<TrashIcon size={16} />}
          onClick={() => {
            setRemoveError(null);
            setConfirmingRemove(true);
          }}
        >
          {t('settings.logo.remove')}
        </Button>
      )
    ) : null;

  const pendingBadge = pending ? (
    <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-caption font-semibold text-warning-fg">
      {t('settings.logo.pending')}
    </span>
  ) : null;

  const errorLine = error ? (
    <p role="alert" className="flex items-start gap-1 text-caption text-danger-fg">
      <AlertCircleIcon size={14} className="mt-px shrink-0" />
      {t(error)}
    </p>
  ) : null;

  const dialog = confirmingRemove ? (
    <ConfirmDialog
      title={t('settings.logo.confirmRemoveTitle')}
      description={t('settings.logo.confirmRemove')}
      confirmLabel={t('settings.logo.confirmRemoveAction')}
      cancelLabel={t('common.cancel')}
      loading={removing}
      error={removeError ? <Alert tone="danger">{t(removeError)}</Alert> : undefined}
      onConfirm={() => void onRemove()}
      onCancel={() => setConfirmingRemove(false)}
    />
  ) : null;

  return (
    <SectionCard title={t('settings.sections.brand')} actions={pendingBadge}>
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-linear-120 from-brand-ink via-brand-indigo to-brand-periwinkle p-5 text-white">
        {picker}
        <div className="min-w-0 flex-1">
          <p className="truncate text-h2">{displayName}</p>
          {details.length > 0 ? (
            <p className="mt-0.5 text-caption text-white/80">{details.join(' · ')}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="mt-2">{errorLine}</div>
      {dialog}
    </SectionCard>
  );
}
