BEGIN;
CREATE TABLE "_ServiceCourses" ("A" TEXT NOT NULL, "B" TEXT NOT NULL);
CREATE UNIQUE INDEX "_ServiceCourses_AB_unique" ON "_ServiceCourses"("A", "B");
CREATE INDEX "_ServiceCourses_B_index" ON "_ServiceCourses"("B");
ALTER TABLE "_ServiceCourses" ADD CONSTRAINT "_ServiceCourses_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ServiceCourses" ADD CONSTRAINT "_ServiceCourses_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "_ServiceCourses" ("A", "B") SELECT "courseId", "id" FROM "Service";
COMMIT;
