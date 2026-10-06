BEGIN;
-- Preserve historical records. A paid record becomes invoiced when retiring Paid.
UPDATE "Service" SET "status" = 'INVOICED' WHERE "status" = 'PAID';
UPDATE "CertificateSale" SET "status" = 'INVOICED' WHERE "status" = 'PAID';
ALTER TYPE "ServiceStatus" RENAME TO "ServiceStatus_old";
CREATE TYPE "ServiceStatus" AS ENUM ('SCHEDULED', 'EXECUTED', 'INVOICED');
ALTER TABLE "Service" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "CertificateSale" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Service" ALTER COLUMN "status" TYPE "ServiceStatus" USING "status"::text::"ServiceStatus";
ALTER TABLE "CertificateSale" ALTER COLUMN "status" TYPE "ServiceStatus" USING "status"::text::"ServiceStatus";
ALTER TABLE "Service" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
ALTER TABLE "CertificateSale" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';
DROP TYPE "ServiceStatus_old";
CREATE TYPE "TravelMode" AS ENUM ('NONE', 'PLANE', 'BUS');
ALTER TABLE "Service" ADD COLUMN "correlativeCode" TEXT, ADD COLUMN "travelMode" "TravelMode" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Service" ADD CONSTRAINT "Service_correlativeCode_check" CHECK ("correlativeCode" IS NULL OR "correlativeCode" ~ '^[0-9]{4}$');
ALTER TABLE "Instructor" ADD COLUMN "address" TEXT, ADD COLUMN "dni" TEXT, ADD COLUMN "courses" TEXT,
 ADD COLUMN "emoExpiresAt" TIMESTAMP(3), ADD COLUMN "sctr" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "carModel" TEXT, ADD COLUMN "carPlate" TEXT;
CREATE TABLE "ServiceDay" (
 "id" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "serviceId" TEXT NOT NULL,
 CONSTRAINT "ServiceDay_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ServiceDay_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceDay_serviceId_date_key" ON "ServiceDay"("serviceId", "date");
CREATE INDEX "ServiceDay_date_idx" ON "ServiceDay"("date");
-- Give every existing service its original agenda day, without copying its amount.
INSERT INTO "ServiceDay" ("id", "date", "serviceId") SELECT 'legacy-' || "id", "serviceDate", "id" FROM "Service";

COMMIT;
