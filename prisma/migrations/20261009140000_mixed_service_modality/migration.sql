-- Additive: existing services keep their modality, dates and single amount.
ALTER TYPE "ClassModality" ADD VALUE IF NOT EXISTS 'MIXED';
ALTER TABLE "ServiceDay" ADD COLUMN "modality" "ClassModality";

-- Preserve historical Virtual/Presencial data for each existing class date.
UPDATE "ServiceDay" AS d
SET "modality" = s."modality"
FROM "Service" AS s
WHERE d."serviceId" = s."id" AND s."modality" IN ('VIRTUAL', 'IN_PERSON');

-- A date is Virtual or Presencial; only the parent service can be mixed.
ALTER TABLE "ServiceDay" ADD CONSTRAINT "ServiceDay_modality_check"
CHECK ("modality" IS NULL OR "modality" IN ('VIRTUAL', 'IN_PERSON'));
