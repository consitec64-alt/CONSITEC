"use client";
import { Download } from 'lucide-react';
import { servicesWorkbook } from '@/lib/services-excel';
import type { Service } from '@/lib/ui-types';
import { useTutorial } from '@/components/dashboard-tutorial';
export default function ServiceCalendarExport({ services, month, year, disabled, onError }: { services: Service[]; month: number; year: number; disabled: boolean; onError: (message: string) => void }) {
  const { active: tutorial } = useTutorial();
  function download() {
    if (disabled || tutorial) return;
    try {
      const bytes = servicesWorkbook(services, month, year), buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url; link.download = `calendario-servicios-${year}-${String(month).padStart(2,'0')}.xlsx`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { onError('No se pudo exportar el calendario. Inténtalo nuevamente.'); }
  }
  return <button type="button" className="btn secondary" disabled={disabled || !!tutorial} onClick={download}><Download size={16} />Exportar a Excel</button>;
}
