import type { CalibrationStatusDto } from '@zentia/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, GearIcon, KpiCard, Skeleton } from '../../../shared/ui';
import { aiService } from '../services/ai.service';

function CalibrationContent({ status }: { status: CalibrationStatusDto }) {
  const { t } = useTranslation();
  const percent = Math.min(100, Math.round((status.closedCount / status.threshold) * 100));
  return (
    <div className="space-y-3">
      <KpiCard
        label={t('ai.calibration.title')}
        value={t('ai.calibration.progress', {
          closed: status.closedCount,
          threshold: status.threshold,
        })}
        icon={<GearIcon size={18} />}
        hint={
          <span
            role="progressbar"
            aria-label={t('ai.calibration.title')}
            aria-valuemin={0}
            aria-valuemax={status.threshold}
            aria-valuenow={Math.min(status.closedCount, status.threshold)}
            className="mt-1 block h-2 overflow-hidden rounded-full bg-neutral-100"
          >
            <span className="block h-full bg-primary-500" style={{ width: `${percent}%` }} />
          </span>
        }
        tag={status.readyForCalibration ? undefined : t('ai.calibration.notReady')}
      />
      {status.readyForCalibration ? (
        <Alert tone="success">{t('ai.calibration.ready')}</Alert>
      ) : null}
    </div>
  );
}

/** Estado de calibración (S9.2.2): solo lectura; si no se recibe, se consulta (Ajustes). */
export function CalibrationCard({ status }: { status?: CalibrationStatusDto }) {
  const [loaded, setLoaded] = useState<CalibrationStatusDto | null | 'error'>(null);

  useEffect(() => {
    if (status) return;
    let cancelled = false;
    aiService
      .getCalibrationStatus()
      .then((result) => !cancelled && setLoaded(result))
      .catch(() => !cancelled && setLoaded('error'));
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status) return <CalibrationContent status={status} />;
  if (loaded === 'error') return null;
  if (!loaded) return <Skeleton className="h-36 rounded-xl" />;
  return <CalibrationContent status={loaded} />;
}
