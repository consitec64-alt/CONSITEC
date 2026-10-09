import { writeFileSync } from 'node:fs';
import { registerWorkbook } from '../lib/register-excel';
const row = { id: 'test', serviceId: 'test-service', instructorId: 'test-instructor', confirmed: true, date: '2026-10-07', instructor: 'José & Ana', company: '=HYPERLINK("https://example.invalid")', courses: ['ISO <9001>', 'SST'], modality: 'Virtual', location: 'Virtual', instructionalMinutes: 241 };
const path = process.argv[2];
if (!path) throw new Error('Provide an output path for the isolated XLSX fixture');
writeFileSync(path, registerWorkbook([row, { ...row, id: 'blank', confirmed: false, company: 'Empresa sin horario', instructionalMinutes: null }]));
