-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'VOIDED');

-- CreateEnum
CREATE TYPE "QuoteEventType" AS ENUM ('DISCOUNT_OVERRIDE', 'EXPIRY_CHANGED', 'REASSIGNED', 'STATE_CHANGED');

-- CreateTable
CREATE TABLE "QuoteSequence" (
    "key" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "customerId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "discountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "shippingAmount" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "shippingTaxable" BOOLEAN NOT NULL,
    "subtotal" DECIMAL(15,0) NOT NULL,
    "linesVat" DECIMAL(15,0) NOT NULL,
    "shippingVat" DECIMAL(15,0) NOT NULL,
    "total" DECIMAL(15,0) NOT NULL,
    "expiresAt" DATE,
    "sentAt" TIMESTAMP(3),
    "firstSentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "productName" VARCHAR(150) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "unitPrice" DECIMAL(15,0) NOT NULL,
    "vatRate" "VatRate" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "lineAmount" DECIMAL(15,0) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteVersion" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changes" JSONB,
    "customerRequest" VARCHAR(1000),
    "authorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteEvent" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "type" "QuoteEventType" NOT NULL,
    "actorId" UUID,
    "versionId" UUID,
    "note" VARCHAR(1000),
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE INDEX "Quote_ownerId_status_idx" ON "Quote"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Quote_status_expiresAt_idx" ON "Quote"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Quote_firstSentAt_idx" ON "Quote"("firstSentAt");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "Quote_updatedAt_idx" ON "Quote"("updatedAt");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteItem_quoteId_productId_key" ON "QuoteItem"("quoteId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteVersion_quoteId_number_key" ON "QuoteVersion"("quoteId", "number");

-- CreateIndex
CREATE INDEX "QuoteEvent_quoteId_createdAt_idx" ON "QuoteEvent"("quoteId", "createdAt");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteEvent" ADD CONSTRAINT "QuoteEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteEvent" ADD CONSTRAINT "QuoteEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Contador del consecutivo de cotizaciones
INSERT INTO "QuoteSequence" ("key", "lastValue") VALUES ('QUOTE', 0);

-- Reglas de cotización (tech plan M4 §1)
ALTER TABLE "Quote"
    ADD CONSTRAINT "Quote_discountPct_check" CHECK ("discountPct" BETWEEN 0 AND 100),
    ADD CONSTRAINT "Quote_shippingAmount_check" CHECK ("shippingAmount" >= 0),
    ADD CONSTRAINT "Quote_expiresAt_check" CHECK ("status" = 'DRAFT' OR "expiresAt" IS NOT NULL);
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quantity_check" CHECK ("quantity" > 0);
