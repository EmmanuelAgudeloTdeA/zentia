export const VAT_RATES = ['GENERAL_19', 'REDUCED_5', 'EXEMPT'] as const;

export type VatRate = (typeof VAT_RATES)[number];
