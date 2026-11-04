-- CreateIndex
CREATE INDEX "Quote_ownerId_firstSentAt_idx" ON "Quote"("ownerId", "firstSentAt");
