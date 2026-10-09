ALTER TABLE "Service" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "CertificateSale" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Service_deletedAt_idx" ON "Service"("deletedAt");
CREATE INDEX "CertificateSale_deletedAt_idx" ON "CertificateSale"("deletedAt");
CREATE TABLE "AuditLog" (
 "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "actorId" TEXT NOT NULL, "actorName" TEXT NOT NULL, "entity" TEXT NOT NULL,
 "recordId" TEXT NOT NULL, "label" TEXT NOT NULL, "action" TEXT NOT NULL,
 "salespersonId" TEXT, "before" JSONB, "after" JSONB,
 CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_salespersonId_createdAt_idx" ON "AuditLog"("salespersonId", "createdAt");
