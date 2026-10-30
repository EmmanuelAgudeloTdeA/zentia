import { LOGO_MAX_BYTES, LOGO_MIME_TYPES, type LogoMimeType } from '@zentia/shared';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { logoUrl, useBrandingStore } from '../../../core/branding';
import { errorKey } from '../../../core/errors';
import {
  Alert,
  AlertCircleIcon,
  Button,
  ConfirmDialog,
  ImageIcon,
  SectionCard,
  toast,
  TrashIcon,
  UploadIcon,
} from '../../../shared/ui';
import { companyService } from '../services/company.service';

interface PendingLogo {
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

export function LogoUploader() {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasLogo = useBrandingStore((state) => state.hasLogo);
  const logoVersion = useBrandingStore((state) => state.logoVersion);
  const setBranding = useBrandingStore((state) => state.setBranding);
  const [pending, setPending] = useState<PendingLogo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    if (!isLogoMimeType(file.type)) {
      setError('errors.LOGO_INVALID_TYPE');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError('errors.LOGO_TOO_LARGE');
      return;
    }
    setPending({ mimeType: file.type, dataUrl: await readAsDataUrl(file) });
  };

  const onSave = async () => {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      const data = pending.dataUrl.slice(pending.dataUrl.indexOf(',') + 1);
      const result = await companyService.uploadLogo({ mimeType: pending.mimeType, data });
      setBranding({ hasLogo: true, logoVersion: result.logoVersion });
      setPending(null);
      toast.success(t('settings.logo.uploaded'));
    } catch (uploadError) {
      setError(errorKey(uploadError));
    } finally {
      setSaving(false);
    }
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

  return (
    <SectionCard title={t('settings.logo.title')}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-0 shadow-sm"
          aria-label={pending ? t('settings.logo.preview') : undefined}
          role={pending ? 'img' : undefined}
        >
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={t('settings.logo.current')}
              className="size-full object-contain p-2"
            />
          ) : (
            <span className="flex flex-col items-center text-caption text-neutral-500">
              <ImageIcon size={24} />
              {t('settings.logo.empty')}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <p id={`${inputId}-hint`} className="text-body-sm text-neutral-600">
            {t('settings.logo.hint')}
          </p>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={LOGO_MIME_TYPES.join(',')}
            className="sr-only"
            aria-describedby={`${inputId}-hint`}
            aria-label={t(hasLogo ? 'settings.logo.change' : 'settings.logo.upload')}
            onChange={(event) => void onFileChange(event)}
          />
          {pending ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setPending(null)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void onSave()} loading={saving}>
                {t('settings.logo.save')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={<UploadIcon size={16} />}
                onClick={() => inputRef.current?.click()}
              >
                {t(hasLogo ? 'settings.logo.change' : 'settings.logo.upload')}
              </Button>
              {hasLogo ? (
                <Button
                  variant="danger-outline"
                  icon={<TrashIcon size={16} />}
                  onClick={() => {
                    setRemoveError(null);
                    setConfirmingRemove(true);
                  }}
                >
                  {t('settings.logo.remove')}
                </Button>
              ) : null}
            </div>
          )}
          {error ? (
            <p role="alert" className="flex items-start gap-1 text-caption text-danger-fg">
              <AlertCircleIcon size={14} className="mt-px shrink-0" />
              {t(error)}
            </p>
          ) : null}
        </div>
      </div>

      {confirmingRemove ? (
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
      ) : null}
    </SectionCard>
  );
}
