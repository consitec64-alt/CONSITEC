ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERVISOR';
ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TABLE "User" ADD COLUMN "avatar" TEXT, ADD COLUMN "textSize" TEXT NOT NULL DEFAULT 'normal', ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "certificateSaleId" TEXT;
CREATE UNIQUE INDEX "Service_certificateSaleId_key" ON "Service"("certificateSaleId");
ALTER TABLE "Service" ADD CONSTRAINT "Service_certificateSaleId_fkey" FOREIGN KEY ("certificateSaleId") REFERENCES "CertificateSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Link only unambiguous, exact historical copies; never guess a sale from its customer name alone.
WITH candidates AS (
 SELECT s.id service_id,c.id sale_id,COUNT(*) OVER(PARTITION BY s.id) sc,COUNT(*) OVER(PARTITION BY c.id) cc
 FROM "Service" s JOIN "CertificateSale" c ON s.company=c."customerName" AND s.amount=c.amount AND s."serviceDate"=c."saleDate" AND s."courseId"=c."courseId" AND s."salespersonId"=c."salespersonId"
 WHERE s."certificatesOnly"=true AND s."deletedAt" IS NULL AND c."deletedAt" IS NULL
) UPDATE "Service" s SET "certificateSaleId"=c.sale_id FROM candidates c WHERE s.id=c.service_id AND c.sc=1 AND c.cc=1;
