-- CreateEnum
CREATE TYPE "VatRate" AS ENUM ('GENERAL_19', 'REDUCED_5', 'EXEMPT');

-- CreateEnum
CREATE TYPE "DocumentLocale" AS ENUM ('es', 'en');

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(150),
    "taxId" VARCHAR(30),
    "address" VARCHAR(250),
    "phone" VARCHAR(30),
    "email" VARCHAR(150),
    "commercialTerms" TEXT,
    "documentLocale" "DocumentLocale" NOT NULL DEFAULT 'es',
    "logoDataUrl" TEXT,
    "logoVersion" INTEGER NOT NULL DEFAULT 0,
    "defaultVatRate" "VatRate" NOT NULL DEFAULT 'GENERAL_19',
    "validityDays" INTEGER NOT NULL DEFAULT 15,
    "discountLimitSeller" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "discountLimitManager" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "discountLimitAdmin" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "shippingTaxable" BOOLEAN NOT NULL DEFAULT false,
    "expiringAlertDays" INTEGER NOT NULL DEFAULT 3,
    "followUpDays" INTEGER NOT NULL DEFAULT 5,
    "coldStartThreshold" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);


-- Fila única y rangos de parámetros (Prisma no declara CHECK en el schema)
ALTER TABLE "CompanySettings"
    ADD CONSTRAINT "CompanySettings_single_row_check" CHECK ("id" = 1),
    ADD CONSTRAINT "CompanySettings_validityDays_check" CHECK ("validityDays" BETWEEN 1 AND 365),
    ADD CONSTRAINT "CompanySettings_expiringAlertDays_check" CHECK ("expiringAlertDays" >= 1 AND "expiringAlertDays" < "validityDays"),
    ADD CONSTRAINT "CompanySettings_followUpDays_check" CHECK ("followUpDays" BETWEEN 1 AND 90),
    ADD CONSTRAINT "CompanySettings_coldStartThreshold_check" CHECK ("coldStartThreshold" BETWEEN 30 AND 50),
    ADD CONSTRAINT "CompanySettings_discountLimitSeller_check" CHECK ("discountLimitSeller" BETWEEN 0 AND 100),
    ADD CONSTRAINT "CompanySettings_discountLimitManager_check" CHECK ("discountLimitManager" BETWEEN 0 AND 100),
    ADD CONSTRAINT "CompanySettings_discountLimitAdmin_check" CHECK ("discountLimitAdmin" BETWEEN 0 AND 100);
