export interface Clock {
  now(): Date;
  /** Fecha calendario de hoy en America/Bogota, formato YYYY-MM-DD. */
  today(): string;
}

const BOGOTA_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  today(): string {
    return BOGOTA_DATE.format(this.now());
  }
}
