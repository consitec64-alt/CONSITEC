BEGIN;
CREATE TYPE "ClassModality" AS ENUM ('VIRTUAL', 'IN_PERSON');
ALTER TABLE "User" ADD COLUMN "salespersonId" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Service" ADD COLUMN "modality" "ClassModality";
ALTER TABLE "ServiceDay" ADD COLUMN "startTime" TEXT, ADD COLUMN "endTime" TEXT;
ALTER TABLE "ServiceDay" ADD CONSTRAINT "ServiceDay_schedule_check" CHECK (("startTime" IS NULL AND "endTime" IS NULL) OR ("startTime" IS NOT NULL AND "endTime" IS NOT NULL AND "startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" > "startTime"));
ALTER TABLE "Instructor" RENAME COLUMN "courses" TO "courseNotes";
CREATE TABLE "_InstructorCourses" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
CREATE UNIQUE INDEX "_InstructorCourses_AB_unique" ON "_InstructorCourses"("A", "B");
CREATE INDEX "_InstructorCourses_B_index" ON "_InstructorCourses"("B");
ALTER TABLE "_InstructorCourses" ADD CONSTRAINT "_InstructorCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_InstructorCourses" ADD CONSTRAINT "_InstructorCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Preserve old free text as notes; do not guess course or account assignments.
COMMIT;
