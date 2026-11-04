import type { CalibrationStatusDto, DashboardSectionDto, TopProbabilityItem } from '@zentia/shared';
import { CalibrationCard } from './calibration-card';
import { TopProbabilitySection } from './top-probability-section';

/** Bloques opcionales del tablero (M8 `sections`) que aporta M9, renderizados por `key`. */
export function DashboardSections({
  sections,
  showOwner,
}: {
  sections: readonly DashboardSectionDto[];
  showOwner: boolean;
}) {
  const top = sections.find((section) => section.key === 'topProbability');
  const calibration = sections.find((section) => section.key === 'calibration');
  const status = calibration?.items[0] as CalibrationStatusDto | undefined;
  if (!top && !status) return null;
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {top ? (
        <div className={status ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <TopProbabilitySection items={top.items as TopProbabilityItem[]} showOwner={showOwner} />
        </div>
      ) : null}
      {status ? <CalibrationCard status={status} /> : null}
    </div>
  );
}
