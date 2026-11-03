import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, CheckIcon, CopyIcon, Dialog } from '../../../shared/ui';

interface TemporaryPasswordDialogProps {
  email: string;
  password: string;
  onClose: () => void;
}

export function TemporaryPasswordDialog({
  email,
  password,
  onClose,
}: TemporaryPasswordDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog
      size="sm"
      title={t('users.temporaryPassword.title')}
      description={t('users.temporaryPassword.subtitle', { email })}
      onClose={onClose}
      closeLabel={t('common.close')}
      dismissible={false}
      footer={<Button onClick={onClose}>{t('users.temporaryPassword.done')}</Button>}
    >
      <div className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
        <code
          className="font-mono text-h2 tracking-wider break-all text-neutral-900"
          data-testid="temporary-password"
        >
          {password}
        </code>
        <Button
          variant="secondary"
          size="sm"
          icon={copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          onClick={() => void copy()}
        >
          {copied ? t('users.temporaryPassword.copied') : t('users.temporaryPassword.copy')}
        </Button>
      </div>
      <div className="mt-4">
        <Alert tone="warning">{t('users.temporaryPassword.notice')}</Alert>
      </div>
    </Dialog>
  );
}
