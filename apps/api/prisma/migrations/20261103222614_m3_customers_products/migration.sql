-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "nameKey" VARCHAR(150) NOT NULL,
    "documentId" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(15),
    "email" VARCHAR(150),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "nameKey" VARCHAR(150) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "categoryKey" VARCHAR(80) NOT NULL,
    "price" DECIMAL(15,0) NOT NULL,
    "vatRate" "VatRate" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_documentId_key" ON "Customer"("documentId");

-- CreateIndex
CREATE INDEX "Customer_isActive_nameKey_idx" ON "Customer"("isActive", "nameKey");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Product_isActive_categoryKey_idx" ON "Product"("isActive", "categoryKey");

-- CreateIndex
CREATE INDEX "Product_categoryKey_idx" ON "Product"("categoryKey");

-- CreateIndex
CREATE INDEX "Product_nameKey_idx" ON "Product"("nameKey");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Al menos un contacto por cliente (RN-31) y precio sin IVA positivo (tech plan M3)
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_contact_check" CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL);
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_check" CHECK ("price" > 0);
