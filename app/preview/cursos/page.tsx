import type { Metadata } from 'next';
import CoursePickerPreview from './course-picker-preview';
export const metadata: Metadata = { title: 'CONSITEC · Preview del catálogo de cursos', robots: { index: false, follow: false } };
export default function Page() { return <CoursePickerPreview />; }
