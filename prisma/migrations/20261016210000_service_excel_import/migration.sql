ALTER TABLE "Service" ADD COLUMN "importKey" TEXT, ADD COLUMN "importedLocation" TEXT;
CREATE UNIQUE INDEX "Service_importKey_key" ON "Service"("importKey");
ALTER TABLE "ServiceDay" ADD COLUMN "reportedInstructionalMinutes" INTEGER;
ALTER TABLE "ServiceDay" ADD CONSTRAINT "ServiceDay_reported_minutes_check"
  CHECK ("reportedInstructionalMinutes" IS NULL OR "reportedInstructionalMinutes" BETWEEN 1 AND 1440);
