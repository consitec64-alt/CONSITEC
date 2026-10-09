CREATE TABLE "MonthlyClose" (
  "id" TEXT NOT NULL,
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT,
  "closedByName" TEXT,
  CONSTRAINT "MonthlyClose_pkey" PRIMARY KEY ("id")
);
