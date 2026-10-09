CREATE TABLE "InstructorConfirmation" (
  "serviceId" TEXT NOT NULL,
  "date" VARCHAR(10) NOT NULL,
  "instructorId" TEXT NOT NULL,
  "confirmed" BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InstructorConfirmation_pkey" PRIMARY KEY ("serviceId", "date", "instructorId"),
  CONSTRAINT "InstructorConfirmation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
