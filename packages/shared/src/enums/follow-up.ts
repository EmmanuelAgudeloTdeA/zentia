export const INTERACTION_TYPES = ['CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'OTHER'] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const NOTIFICATION_TYPES = ['QUOTE_EXPIRING', 'QUOTE_NO_FOLLOW_UP'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
