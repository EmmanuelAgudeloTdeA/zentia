import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  /** Solo para MANAGER y ADMIN; un SELLER que lo envía ve igual solo lo suyo. */
  ownerId: z.uuid().optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const dashboardSectionDtoSchema = z.object({
  key: z.string(),
  items: z.array(z.unknown()),
});

export type DashboardSectionDto = z.infer<typeof dashboardSectionDtoSchema>;

export const dashboardSummaryDtoSchema = z.object({
  scope: z.object({ ownerId: z.uuid().nullable() }),
  current: z.object({ active: z.int(), pendingFollowUp: z.int(), followUpDays: z.int() }),
  period: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
    approved: z.int(),
    rejected: z.int(),
    expired: z.int(),
    closed: z.int(),
    quotedAmount: z.string(),
    approvedAmount: z.string(),
    /** Porcentaje con 2 decimales ("37.50"); `null` si no hay cerradas en el período. */
    conversionRate: z.string().nullable(),
  }),
  sections: z.array(dashboardSectionDtoSchema),
});

export type DashboardSummaryDto = z.infer<typeof dashboardSummaryDtoSchema>;
