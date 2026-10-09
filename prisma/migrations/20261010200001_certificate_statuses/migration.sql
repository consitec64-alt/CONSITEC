-- Preserve historical statuses: do not infer payment from execution or invoicing.
UPDATE "Service" s SET "deletedAt"=CURRENT_TIMESTAMP FROM "CertificateSale" c WHERE s."certificateSaleId"=c.id AND (c."customerType"!='COMPANY' OR c.amount<=700) AND s."deletedAt" IS NULL;
