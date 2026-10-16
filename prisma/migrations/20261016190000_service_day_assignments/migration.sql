-- Empty arrays inherit the service-wide catalogs; historical days retain their behavior.
ALTER TABLE "ServiceDay"
  ADD COLUMN "courseIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "instructorIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
