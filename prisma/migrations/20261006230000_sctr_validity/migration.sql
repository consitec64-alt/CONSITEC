ALTER TABLE "Instructor" ADD COLUMN "sctrStartsAt" TIMESTAMP(3), ADD COLUMN "sctrEndsAt" TIMESTAMP(3);
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_sctr_period_check" CHECK (("sctrStartsAt" IS NULL AND "sctrEndsAt" IS NULL) OR ("sctrStartsAt" IS NOT NULL AND "sctrEndsAt" IS NOT NULL AND "sctrEndsAt" >= "sctrStartsAt"));
