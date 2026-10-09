"use client";
import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { UserRound, X } from 'lucide-react';

type Profile = { state: 'active' | 'deleted' | 'unknown'; name: string; avatar: string | null; role: string | null; commercial: string | null; registeredAt: string | null };
export default function RecordProfile({ entity, recordId }: { entity: 'SERVICE' | 'CERTIFICATE' | 'QUOTATION' | 'HISTORY'; recordId: string }) {
  const [open, setOpen] = useState(false), [profile, setProfile] = useState<Profile | null>(null), [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null), title = useId();
  function close() { dialog.current?.close(); setOpen(false); }
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    node?.showModal();
    // Parent record dialogs listen on document; isolate the top dialog before
    // those native listeners can close a form or intercept its focus trap.
    const isolateKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Tab') event.stopPropagation();
    };
    node?.addEventListener('keydown', isolateKeyboard);
    const controller = new AbortController();
    setProfile(null); setError('');
    void fetch(`/api/record-profile?entity=${entity}&id=${encodeURIComponent(recordId)}`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'No se pudo cargar el perfil');
      if (!controller.signal.aborted) setProfile(data);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => { controller.abort(); node?.removeEventListener('keydown', isolateKeyboard); };
  }, [open, entity, recordId]);
  const action = entity === 'HISTORY';
  return <><button type="button" className="record-profile-link" aria-label={action ? 'Ver perfil de quien realizó este cambio' : 'Ver perfil de quien creó este registro'} onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}><UserRound size={14} aria-hidden="true"/>Ver perfil</button>{open && <dialog ref={dialog} className="dialog record-profile-dialog" aria-labelledby={title} onCancel={e => { e.preventDefault(); close(); }} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Tab') e.stopPropagation(); }}><div className="section-heading"><h2 id={title}>{action ? 'Quién realizó el cambio' : 'Quién registró esta operación'}</h2><button type="button" className="icon-button" aria-label="Cerrar perfil del autor" onClick={close}><X size={20}/></button></div>{error ? <p role="alert" className="error-banner">{error}</p> : !profile ? <p role="status">Cargando perfil…</p> : <><div className="record-author-card"><span className="profile-avatar">{profile.avatar ? <Image unoptimized src={profile.avatar} alt={`Foto de ${profile.name}`} width={88} height={88}/> : <UserRound size={36} aria-hidden="true"/>}</span><div><h3>{profile.name}</h3>{profile.role && <span className="record-author-role">{profile.role}</span>}</div></div>{profile.commercial && <p><strong>Comercial del registro:</strong> {profile.commercial}</p>}{profile.registeredAt && <p><strong>{action ? 'Fecha del cambio:' : 'Fecha de registro:'}</strong> {new Date(profile.registeredAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>}{profile.state === 'unknown' && <p className="form-note">Este registro no tiene un historial de creación. No es posible identificar con certeza quién lo registró.</p>}{profile.state === 'deleted' && <p className="form-note">La cuenta que realizó esta operación fue eliminada. La venta y su comercial se conservan.</p>}</>}</dialog>}</>;
}
