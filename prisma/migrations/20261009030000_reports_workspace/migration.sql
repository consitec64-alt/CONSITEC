ALTER TYPE "Role" ADD VALUE 'REPORTS';
CREATE TYPE "ReportStatus" AS ENUM ('PENDING','IN_PROGRESS','IN_REVIEW','DELIVERED');
CREATE TABLE "ServiceReport" (
 "id" TEXT NOT NULL PRIMARY KEY, "serviceId" TEXT NOT NULL UNIQUE, "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
 "assigneeId" TEXT, "dueDate" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "notes" TEXT NOT NULL DEFAULT '', "folderUrl" TEXT, "finalReportUrl" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "ReportDocument" (
 "id" TEXT NOT NULL PRIMARY KEY, "reportId" TEXT, "name" TEXT NOT NULL, "pathname" TEXT NOT NULL UNIQUE,
 "contentType" TEXT NOT NULL, "size" INTEGER NOT NULL, "category" TEXT NOT NULL, "sessionDate" TIMESTAMP(3),
 "uploaderId" TEXT, "uploaderName" TEXT NOT NULL, "state" TEXT NOT NULL DEFAULT 'PENDING',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "uploadedAt" TIMESTAMP(3),
 FOREIGN KEY ("reportId") REFERENCES "ServiceReport"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ReportDocument_reportId_state_idx" ON "ReportDocument"("reportId", "state");
