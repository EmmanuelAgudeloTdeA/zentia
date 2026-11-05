import type { ProbabilityDto } from '@zentia/shared';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, Skeleton } from '../../../shared/ui';
import type { ProbabilitiesState } from '../hooks/use-probabilities';

interface ProbabilityBadgeProps {
  probability: ProbabilityDto;
  /** Compacto: porcentaje y rótulo abreviado, sin popover (notificaciones). */
  compact?: boolean;
}

/** Tono `info` para no confundirse con los estados Aprobada/Rechazada. */
const BADGE_CLASSES =
  'inline-flex h-6 items-center gap-1 rounded-full border border-info-border bg-info-bg px-2.5 text-caption font-medium whitespace-nowrap text-info-fg';

function signed(points: number): string {
  return points > 0 ? `+${points}` : `−${Math.abs(points)}`;
}

export function ProbabilityBadge({ probability, compact = false }: ProbabilityBadgeProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const value = `${probability.probability} %`;

  if (compact) {
    return (
      <span className={BADGE_CLASSES} title={t('ai.probability.rulesEstimate')}>
        {value} · {t('ai.probability.rulesEstimateShort')}
      </span>
    );
  }

  return (
    <span className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        className={`${BADGE_CLASSES} cursor-pointer hover:brightness-95`}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`${t('ai.probability.label')}: ${value}, ${t('ai.probability.rulesEstimate')}`}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {value} · {t('ai.probability.rulesEstimate')}
      </button>
      {open ? (
        <Popover
          anchorRef={triggerRef}
          onClose={() => setOpen(false)}
          id={popoverId}
          role="tooltip"
          align="start"
          className="w-64 p-3 text-left"
        >
          <span className="block text-caption font-semibold text-neutral-700">
            {t('ai.probability.factorsTitle')}
          </span>
          <span className="mt-1 block space-y-1">
            {probability.factors.map((factor) => (
              <span
                key={factor.code}
                className="flex justify-between gap-3 text-body-sm text-neutral-800"
              >
                <span>{t(`ai.probability.factors.${factor.code}`)}</span>
                <span className="font-medium tabular-nums">{signed(factor.points)}</span>
              </span>
            ))}
          </span>
        </Popover>
      ) : null}
    </span>
  );
}

/** Celda o espacio de probabilidad según el estado de carga: "—" si no aplica o si falló. */
export function ProbabilityCell({
  quoteId,
  state,
}: {
  quoteId: string;
  state: ProbabilitiesState;
}) {
  const { t } = useTranslation();
  if (state.status === 'loading') return <Skeleton className="h-6 w-24" />;
  const probability = state.status === 'ready' ? state.byId.get(quoteId) : undefined;
  if (probability) return <ProbabilityBadge probability={probability} />;
  return (
    <span
      className="text-neutral-400"
      title={state.status === 'error' ? t('ai.probability.error') : undefined}
    >
      —
    </span>
  );
}
