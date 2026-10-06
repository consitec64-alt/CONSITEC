"use client";
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === 'dark'); }, []);
  function toggle() {
    const next = !dark;setDark(next);document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { localStorage.setItem('consitec-theme', next ? 'dark' : 'light'); } catch { /* The theme still works without storage. */ }
  }
  return <button type="button" className="theme-toggle icon-button" aria-label={dark ? 'Activar tema claro' : 'Activar tema oscuro'} title={dark ? 'Tema claro' : 'Tema oscuro'} onClick={toggle}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button>;
}
