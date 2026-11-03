import { useTranslation } from 'react-i18next';
import { Badge, CheckCircleIcon, UserOffIcon } from '../../../shared/ui';

export function CustomerStatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return active ? (
    <Badge tone="success" icon={<CheckCircleIcon size={14} />}>
      {t('common.status.active')}
    </Badge>
  ) : (
    <Badge tone="neutral" icon={<UserOffIcon size={14} />}>
      {t('common.status.inactive')}
    </Badge>
  );
}
