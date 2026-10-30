import { Decimal as DecimalJs } from 'decimal.js';

/** Decimal con redondeo half-up; única clase decimal para montos y porcentajes. */
export const Decimal = DecimalJs.clone({ rounding: DecimalJs.ROUND_HALF_UP });

export type Decimal = InstanceType<typeof Decimal>;
