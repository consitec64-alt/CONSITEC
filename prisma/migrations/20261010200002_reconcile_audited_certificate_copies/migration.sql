BEGIN;
-- Older copies have no FK. The two CREATE audits share the transaction timestamp,
-- actor and original sale data; edited current amounts/names cannot break this link.
CREATE TEMP TABLE certificate_copy_repairs ON COMMIT DROP AS
WITH pairs AS (
 SELECT DISTINCT s.id service_id,c.id sale_id
 FROM "AuditLog" a JOIN "AuditLog" b ON a."createdAt"=b."createdAt" AND a."actorId"=b."actorId"
 JOIN "Service" s ON s.id=a."recordId"
 JOIN "CertificateSale" c ON c.id=b."recordId"
 WHERE a.entity='SERVICE' AND a.action='CREATE' AND b.entity='CERTIFICATE' AND b.action='CREATE'
 AND a.after->>'certificatesOnly'='true'
 AND a.after->>'company'=b.after->>'customerName'
 AND a.after->>'amount'=b.after->>'amount'
 AND a.after->>'serviceDate'=b.after->>'saleDate'
 AND a.after->>'salespersonId'=b.after->>'salespersonId'
 AND s."certificateSaleId" IS NULL AND s."deletedAt" IS NULL
 AND s."instructorId" IS NULL AND NOT EXISTS(SELECT 1 FROM "_ServiceInstructors" si WHERE si."B"=s.id)
 AND NOT EXISTS(SELECT 1 FROM "Service" other WHERE other."certificateSaleId"=c.id)
 AND NOT EXISTS(SELECT 1 FROM "MonthlyClose" m WHERE m."closedAt" IS NOT NULL AND m.id IN(TO_CHAR(s."serviceDate",'YYYY-MM'),TO_CHAR(c."saleDate",'YYYY-MM'),TO_CHAR(c."invoicedAt",'YYYY-MM')))
), counted AS (SELECT *,COUNT(*) OVER(PARTITION BY service_id) sc,COUNT(*) OVER(PARTITION BY sale_id) cc FROM pairs)
SELECT service_id,sale_id FROM counted WHERE sc=1 AND cc=1;
UPDATE "Service" s SET "certificateSaleId"=r.sale_id FROM certificate_copy_repairs r WHERE s.id=r.service_id;
UPDATE "Service" s SET "deletedAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP FROM certificate_copy_repairs r JOIN "CertificateSale" c ON c.id=r.sale_id
WHERE s.id=r.service_id AND (c."deletedAt" IS NOT NULL OR c."customerType"!='COMPANY' OR c.amount<=700);
UPDATE "Service" s SET company=c."customerName",amount=c.amount,"serviceDate"=c."saleDate","courseId"=c."courseId","correlativeCode"=c."correlativeCode","salespersonId"=c."salespersonId",status=CASE WHEN c.status='INVOICED' THEN 'INVOICED'::"ServiceStatus" ELSE 'SCHEDULED'::"ServiceStatus" END,"invoicedAt"=CASE WHEN c.status='INVOICED' THEN c."invoicedAt" ELSE NULL END,"updatedAt"=CURRENT_TIMESTAMP
FROM certificate_copy_repairs r JOIN "CertificateSale" c ON c.id=r.sale_id WHERE s.id=r.service_id AND s."deletedAt" IS NULL;
DELETE FROM "ServiceDay" d USING certificate_copy_repairs r,"Service" s WHERE d."serviceId"=r.service_id AND s.id=r.service_id AND s."deletedAt" IS NULL;
INSERT INTO "ServiceDay"(id,date,"serviceId") SELECT 'cert-sync-'||s.id,s."serviceDate",s.id FROM certificate_copy_repairs r JOIN "Service" s ON s.id=r.service_id WHERE s."deletedAt" IS NULL;
DELETE FROM "_ServiceCourses" sc USING certificate_copy_repairs r,"Service" s WHERE sc."B"=r.service_id AND s.id=r.service_id AND s."deletedAt" IS NULL;
INSERT INTO "_ServiceCourses"("A","B") SELECT cc."B",s.id FROM certificate_copy_repairs r JOIN "Service" s ON s.id=r.service_id JOIN "_CertificateCourses" cc ON cc."A"=r.sale_id WHERE s."deletedAt" IS NULL ON CONFLICT DO NOTHING;
COMMIT;
