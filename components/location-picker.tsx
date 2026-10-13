"use client";
import { useId, useState } from 'react';
import { Search } from 'lucide-react';
import type { Meta } from '@/lib/ui-types';
export default function LocationPicker({locations,initialId=''}:{locations:Meta[];initialId?:string}) {
  const [query,setQuery] = useState(''), [selected,setSelected] = useState(initialId), id = useId();
  const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  const matches = locations.filter(location=>normalize(`${location.department??''} ${location.district??''}`).includes(normalize(query.trim())));
  const current = locations.find(location=>location.id===selected);
  return <fieldset className="location-picker full-width"><legend>Ubicación <small>(opcional)</small></legend><label className="catalog-search"><Search size={16}/><span className="sr-only">Buscar ubicación</span><input type="search" placeholder="Buscar departamento o distrito…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label htmlFor={id}>Ubicación del servicio</label><select id={id} name="locationId" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Sin asignar</option>{current&&!matches.some(location=>location.id===selected)&&<option value={current.id}>{current.department} / {current.district} (seleccionada)</option>}{matches.map(location=><option key={location.id} value={location.id}>{location.department} / {location.district}</option>)}</select>{!matches.length&&<p className="form-note">No hay ubicaciones que coincidan con la búsqueda.</p>}</fieldset>;
}
