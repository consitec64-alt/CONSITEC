"use client";
import {useState} from 'react';
import CatalogPicker from '@/components/catalog-picker';
import {certificateCourses,type CertificateSale,type Meta} from '@/lib/ui-types';
export default function CertificateFields({sale,courses,previewCompany=false,onCustomerTypeChange}:{sale:CertificateSale|null;courses:Meta[];previewCompany?:boolean;onCustomerTypeChange?:(type:string)=>void}){
 const [kind,setKind]=useState(sale?.certificateKind||'OPERATOR');
 const [customerType,setCustomerType]=useState(sale?.customerType||'NATURAL_PERSON');
 const [selected,setSelected]=useState(()=>sale?certificateCourses(sale).map(c=>c.id):[]);
 const company=kind==='INSPECTION'||previewCompany||customerType==='COMPANY';
 return <>
  <section className="record-section full-width"><div className="record-section-title"><span>01</span><div><h3>Cliente y certificado</h3><p>Define qué vendes y a quién.</p></div></div><div className="form-grid">
   <label>Tipo de certificado<select name="certificateKind" value={kind} onChange={e=>{setKind(e.target.value as 'OPERATOR'|'INSPECTION');if(e.target.value==='INSPECTION'){setCustomerType('COMPANY');onCustomerTypeChange?.('COMPANY');}}}><option value="OPERATOR">Operador</option><option value="INSPECTION">Inspección</option></select></label>
   <label>Tipo de cliente<select name="customerType" value={company?'COMPANY':customerType} onChange={e=>{setCustomerType(e.target.value);onCustomerTypeChange?.(e.target.value);}} disabled={kind==='INSPECTION'}><option value="NATURAL_PERSON">Persona natural</option><option value="COMPANY">Empresa</option></select>{kind==='INSPECTION'&&<input type="hidden" name="customerType" value="COMPANY"/>}</label>
   <label className="full-width">{company?'Razón social de la empresa':'Nombre del cliente'}<input name="customerName" placeholder={company?'Razón social':'Nombre completo'} maxLength={200} defaultValue={sale?.customerName} required/></label>
   {company&&<label className="full-width">Código de correlativo<input name="correlativeCode" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} defaultValue={sale?.correlativeCode||''} placeholder="Ej. 0042" title="Exactamente 4 dígitos numéricos" required/><small>Obligatorio para empresas, independientemente del importe.</small></label>}
   {kind==='INSPECTION'&&<p className="field-hint full-width">Los certificados de inspección se registran únicamente para empresas.</p>}
  </div></section>
  <section className="record-section full-width"><div className="record-section-title"><span>02</span><div><h3>Cursos incluidos</h3><p>Una venta puede reunir varios cursos.</p></div></div><CatalogPicker title="Cursos del certificado" name="courseIds" items={courses} selected={selected} onChange={setSelected} className="course-picker" description="Elige al menos un curso. El importe total se registra una sola vez."/></section>
 </>;
}
