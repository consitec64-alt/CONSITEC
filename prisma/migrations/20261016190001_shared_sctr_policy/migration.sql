CREATE TABLE "SctrPolicy" (
  "id" TEXT NOT NULL DEFAULT 'shared',
  "sctrStartsAt" TIMESTAMP(3) NOT NULL,
  "sctrEndsAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SctrPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SctrPolicy_singleton_check" CHECK ("id" = 'shared'),
  CONSTRAINT "SctrPolicy_period_check" CHECK ("sctrEndsAt" >= "sctrStartsAt")
);

-- Reuse a legacy period only if every enrolled instructor has the same complete range.
-- Different or incomplete periods require an explicit shared policy; keep legacy data.
INSERT INTO "SctrPolicy" ("id", "sctrStartsAt", "sctrEndsAt")
SELECT 'shared', MIN("sctrStartsAt"), MIN("sctrEndsAt")
FROM "Instructor" WHERE "sctr" = TRUE
HAVING COUNT(*) > 0
  AND COUNT("sctrStartsAt") = COUNT(*) AND COUNT("sctrEndsAt") = COUNT(*)
  AND COUNT(DISTINCT ("sctrStartsAt", "sctrEndsAt")) = 1;
