CREATE TABLE "CommercialWeekPlan" (
  "id" TEXT NOT NULL,
  "ranges" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialWeekPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialWeekPlan_ranges_check" CHECK (jsonb_typeof("ranges")='array' AND jsonb_array_length("ranges") BETWEEN 1 AND 6)
);
