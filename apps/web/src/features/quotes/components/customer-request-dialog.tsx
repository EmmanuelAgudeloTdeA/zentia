import { CUSTOMER_REQUEST_MAX_LENGTH } from '@zentia/shared';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, TextArea } from '../../../shared/ui';

interface CustomerRequestDialogProps {
  title: string;
  description?: ReactNode;
  label: string;
  submitLabel: string;
  loading: boolean;
  error?: ReactNode;
  /** Contenido extra (vista previa de reactivación). */
  children?: ReactNode;
  size?: 'md' | 'lg';
  maxLength?: number;
  onSubmit: (text: string) => void;
  onClose: () => void;
}

/** Texto obligatorio (lo que solicitó el cliente o el motivo) con contador de caracteres. */
export function CustomerRequestDialog({
  title,
  description,
  label,
  submitLabel,
  loading,
  error,
  children,
  size = 'md',
  maxLength = CUSTOMER_REQUEST_MAX_LENGTH,
  onSubmit,
  onClose,
}: CustomerRequestDialogProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const empty = text.trim() === '';

  return (
    <Dialog
      size={size}
      title={title}
      description={description}
      onClose={onClose}
      closeLabel={t('common.close')}
      dismissible={!loading && empty}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              setTouched(true);
              if (!empty) onSubmit(text.trim());
            }}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {children}
        <TextArea
          label={label}
          required
          rows={4}
          maxLength={maxLength}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => setTouched(true)}
          error={touched && empty ? t('validation.required') : undefined}
          hint={`${text.length} / ${maxLength}`}
        />
        {error}
      </div>
    </Dialog>
  );
}
