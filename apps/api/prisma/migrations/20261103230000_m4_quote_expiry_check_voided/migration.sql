-- Un Borrador anulado queda en VOIDED sin fecha de vencimiento (nunca se envió).
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_expiresAt_check";
ALTER TABLE "Quote"
    ADD CONSTRAINT "Quote_expiresAt_check" CHECK ("status" IN ('DRAFT', 'VOIDED') OR "expiresAt" IS NOT NULL);
