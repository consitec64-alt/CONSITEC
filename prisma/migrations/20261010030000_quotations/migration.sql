-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "contact" TEXT NOT NULL DEFAULT '',
    "participants" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "modality" "ClassModality",
    "tentativeDates" TEXT[],
    "validUntil" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "conditions" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "salespersonId" TEXT NOT NULL,
    "serviceId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationDocument" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QuotationCourses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_serviceId_key" ON "Quotation"("serviceId");

-- CreateIndex
CREATE INDEX "Quotation_salespersonId_createdAt_idx" ON "Quotation"("salespersonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationDocument_pathname_key" ON "QuotationDocument"("pathname");

-- CreateIndex
CREATE INDEX "QuotationDocument_quotationId_state_idx" ON "QuotationDocument"("quotationId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "_QuotationCourses_AB_unique" ON "_QuotationCourses"("A", "B");

-- CreateIndex
CREATE INDEX "_QuotationCourses_B_index" ON "_QuotationCourses"("B");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationDocument" ADD CONSTRAINT "QuotationDocument_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuotationCourses" ADD CONSTRAINT "_QuotationCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuotationCourses" ADD CONSTRAINT "_QuotationCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
