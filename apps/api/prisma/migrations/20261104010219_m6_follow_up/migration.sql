-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CALL', 'EMAIL', 'WHATSAPP', 'MEETING', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('QUOTE_EXPIRING', 'QUOTE_NO_FOLLOW_UP');

-- CreateTable
CREATE TABLE "Interaction" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "quoteId" UUID,
    "type" "InteractionType" NOT NULL,
    "note" VARCHAR(2000) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "authorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "params" JSONB NOT NULL,
    "referenceDate" DATE NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interaction_customerId_occurredAt_idx" ON "Interaction"("customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "Interaction_quoteId_occurredAt_idx" ON "Interaction"("quoteId", "occurredAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_quoteId_type_referenceDate_key" ON "Notification"("quoteId", "type", "referenceDate");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- La nota es obligatoria (1 a 2000 caracteres, RN-35)
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_note_check" CHECK (char_length("note") BETWEEN 1 AND 2000);
