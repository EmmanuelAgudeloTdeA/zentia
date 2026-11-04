import type { ProbabilityDto } from '@zentia/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../../shared/ui';
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
  const rootRef = useRef<HTMLSpanElement>(null);
  const value = `${probability.probability} %`;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  if (compact) {
    return (
      <span className={BADGE_CLASSES} title={t('ai.probability.rulesEstimate')}>
        {value} · {t('ai.probability.rulesEstimateShort')}
      </span>
    );
  }

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className={`${BADGE_CLASSES} cursor-pointer hover:brightness-95`}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`${t('ai.probability.label')}: ${value}, ${t('ai.probability.rulesEstimate')}`}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        {value} · {t('ai.probability.rulesEstimate')}
      </button>
      {open ? (
        <span
          id={popoverId}
          role="tooltip"
          className="absolute top-full left-0 z-20 mt-2 w-64 rounded-md border border-neutral-200 bg-neutral-0 p-3 text-left shadow-lg"
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
        </span>
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
