-- La deduplicación incluye al destinatario: tras una reasignación, el nuevo dueño recibe la alerta del ciclo aunque el anterior ya la haya leído.
DROP INDEX "Notification_quoteId_type_referenceDate_key";

-- CreateIndex
CREATE UNIQUE INDEX "Notification_quoteId_type_referenceDate_userId_key" ON "Notification"("quoteId", "type", "referenceDate", "userId");
