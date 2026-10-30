import { useTranslation } from 'react-i18next';

interface ValidityTimelineProps {
  validityDays: number;
  expiringAlertDays: number;
  followUpDays: number;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}

const percent = (value: number) => `${Math.min(Math.max(value, 0), 1) * 100}%`;

export function ValidityTimeline({
  validityDays,
  expiringAlertDays,
  followUpDays,
}: ValidityTimelineProps) {
  const { t, i18n } = useTranslation();
  if (![validityDays, expiringAlertDays, followUpDays].every(isPositiveInteger)) return null;
  if (expiringAlertDays >= validityDays) return null;

  const format = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' });
  const today = new Date();
  const expires = addDays(today, validityDays);
  const expiring = addDays(expires, -expiringAlertDays);
  const followUp = addDays(today, followUpDays);
  const followUpInside = followUpDays < validityDays;

  return (
    <figure className="rounded-lg border border-primary-100 bg-primary-50 p-4">
      <figcaption className="text-body-sm text-neutral-700">
        {t(followUpInside ? 'settings.timeline.summary' : 'settings.timeline.summaryNoFollowUp', {
          expires: format.format(expires),
          expiring: format.format(expiring),
          followUp: format.format(followUp),
          followUpDays,
        })}
      </figcaption>
      <div aria-hidden="true" className="mt-6 mb-1">
        <div className="relative h-2 rounded-full bg-primary-200">
          <div
            className="absolute inset-y-0 right-0 rounded-r-full bg-warning-border"
            style={{ left: percent((validityDays - expiringAlertDays) / validityDays) }}
          />
          <span className="absolute top-1/2 left-0 size-3.5 -translate-y-1/2 rounded-full border-2 border-neutral-0 bg-primary-600 shadow-sm" />
          {followUpInside ? (
            <span
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-neutral-0 bg-primary-400 shadow-sm"
              style={{ left: percent(followUpDays / validityDays) }}
            >
              <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 text-caption whitespace-nowrap text-primary-700">
                {t('settings.timeline.followUp')}
              </span>
            </span>
          ) : null}
          <span className="absolute top-1/2 right-0 size-3.5 -translate-y-1/2 rounded-full border-2 border-neutral-0 bg-warning-fg shadow-sm" />
        </div>
        <div className="mt-2 flex justify-between text-caption">
          <span className="font-medium text-primary-700">{t('settings.timeline.sent')}</span>
          <span className="text-warning-fg">
            {t('settings.timeline.expiring', { date: format.format(expiring) })}
          </span>
          <span className="font-medium text-warning-fg">
            {t('settings.timeline.expires', { date: format.format(expires) })}
          </span>
        </div>
      </div>
    </figure>
  );
}
