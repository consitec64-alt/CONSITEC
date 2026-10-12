"use client";
import { useEffect, useState } from 'react';
import { readPreferences, applyPreferences } from '@/lib/preferences';
import { Moon, Sun } from 'lucide-react';
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { const update=()=>setDark(document.documentElement.dataset.theme==='dark');update();window.addEventListener('preferences-updated',update);return()=>window.removeEventListener('preferences-updated',update); }, []);
  function toggle() {
    const next = !dark;setDark(next);document.documentElement.dataset.theme = next ? 'dark' : 'light';
    void fetch('/api/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({preferences:{theme:next?'dark':'light'}})}).then(async r=>{if(r.ok){const user=await r.json();applyPreferences(readPreferences(user.preferences));}}).catch(()=>{});
    try { localStorage.setItem('consitec-theme', next ? 'dark' : 'light'); } catch { /* The theme still works without storage. */ }
  }
  return <button type="button" className="theme-toggle icon-button" aria-label={dark ? 'Activar tema claro' : 'Activar tema oscuro'} title={dark ? 'Tema claro' : 'Tema oscuro'} onClick={toggle}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>;
}
