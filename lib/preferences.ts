export const workspaceViews = [
  { id: 'summary', label: 'Vista general' }, { id: 'quotations', label: 'Cotizaciones' },
  { id: 'certificates', label: 'Venta de certificados' }, { id: 'performance', label: 'Rendimiento comercial' },
  { id: 'services', label: 'Agenda de servicios' }, { id: 'instructors', label: 'Registro de instructores' },
  { id: 'support', label: 'Catálogos y equipo' }, { id: 'history', label: 'Historial de cambios' }, { id: 'trash', label: 'Papelera' }
] as const;
export type Preferences = { theme: 'light' | 'dark'; compactSidebar: boolean; homeView: string; favorites: string[]; classReminder: 'full' | 'compact' };
export const defaultPreferences: Preferences = { theme: 'light', compactSidebar: false, homeView: 'summary', favorites: [], classReminder: 'full' };
export function allowedViews(role: string) { return workspaceViews.filter(v => role !== 'SUPERVISOR' || ['summary','services','instructors'].includes(v.id)); }
export function readPreferences(value: unknown): Preferences { return { ...defaultPreferences, ...(value && typeof value === 'object' && !Array.isArray(value) ? value : {}) } as Preferences; }
export function validatePreferences(value: unknown, role: string): Partial<Preferences> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Preferencias inválidas');
  const result: Partial<Preferences> = {}, body = value as Record<string, unknown>, allowed = allowedViews(role).map(v => String(v.id));
  for (const key of Object.keys(body)) if (!Object.keys(defaultPreferences).includes(key)) throw Error('Preferencia desconocida');
  if (body.theme !== undefined) { if (typeof body.theme !== 'string' || !['light','dark'].includes(body.theme)) throw Error('Tema inválido'); result.theme = body.theme as Preferences['theme']; }
  if (body.compactSidebar !== undefined) { if (typeof body.compactSidebar !== 'boolean') throw Error('Barra lateral inválida'); result.compactSidebar = body.compactSidebar; }
  if (body.homeView !== undefined) { if (typeof body.homeView !== 'string' || !allowed.includes(body.homeView)) throw Error('Vista inicial no disponible para tu rol'); result.homeView = body.homeView; }
  if (body.favorites !== undefined) { if (!Array.isArray(body.favorites) || body.favorites.length > 5 || body.favorites.some(v => typeof v !== 'string' || !allowed.includes(v))) throw Error('Elige hasta cinco favoritos disponibles para tu rol'); result.favorites = [...new Set(body.favorites)] as string[]; }
  if (body.classReminder !== undefined) { if (typeof body.classReminder !== 'string' || !['full','compact'].includes(body.classReminder)) throw Error('Recordatorio inválido'); result.classReminder = body.classReminder as Preferences['classReminder']; }
  return result;
}
export function applyPreferences(preferences: Preferences) {
  document.documentElement.dataset.theme = preferences.theme;
  try { localStorage.setItem('consitec-theme', preferences.theme); } catch {}
  window.dispatchEvent(new CustomEvent('preferences-updated', { detail: preferences }));
}
