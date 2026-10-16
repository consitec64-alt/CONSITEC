import type { Metadata } from 'next';
import FormsPreview from './forms-preview';
export const metadata: Metadata = { title: 'CONSITEC · Preview de formularios', robots: { index: false, follow: false } };
export default function Page() { return <FormsPreview />; }
