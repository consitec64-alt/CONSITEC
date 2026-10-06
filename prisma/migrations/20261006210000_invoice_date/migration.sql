BEGIN;
ALTER TABLE "Service" ADD COLUMN "invoicedAt" TIMESTAMP(3);
ALTER TABLE "CertificateSale" ADD COLUMN "invoicedAt" TIMESTAMP(3);
-- Historical invoice dates are unknown; preserve the previously used month.
UPDATE "Service" SET "invoicedAt" = "serviceDate" WHERE "status" = 'INVOICED';
UPDATE "CertificateSale" SET "invoicedAt" = "saleDate" WHERE "status" = 'INVOICED';
CREATE INDEX "Service_invoicedAt_idx" ON "Service"("invoicedAt");
CREATE INDEX "CertificateSale_invoicedAt_idx" ON "CertificateSale"("invoicedAt");
COMMIT;
