import { NextResponse } from 'next/server';
import { Prisma, QuotationStatus, ClassModality } from '@prisma/client';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { recordError } from '@/lib/record-error';
import { InvalidRecord, invoiceDate } from '@/lib/record-input';
export const QUOTATION_LIMIT = 10 * 1024 * 1024;
export const quotationInclude = { courses: true, salesperson: true, documents: { where: { state: 'READY' }, orderBy: { createdAt: 'desc' as const } }, service: { select: { id: true, deletedAt: true, serviceDate: true, correlativeCode: true } } };
export class QuotationError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function quotationActor() {
 const actor = await currentUser();
 if (!actor) throw new QuotationError('Debes iniciar sesión', 401);
 if (!['ADMIN','SALES','SUPERVISOR'].includes(actor.role)) throw new QuotationError('Acceso comercial requerido',403);
 return actor;
}
export function quotationOwner(actor: {role:string;salespersonId:string|null}) { return actor.role !== 'SALES' ? {} : { salespersonId: actor.salespersonId || '__unassigned__' }; }
export function quotationError(e: unknown) { return e instanceof QuotationError ? NextResponse.json({error:e.message},{status:e.status}) : recordError(e); }
export function quotationInput(body: Record<string,unknown>) {
 const text = (key:string,max:number,required=false) => { const val=body[key]??''; if(typeof val!=='string'||val.length>max||(required&&!val.trim()))throw new InvalidRecord(`Revisa ${key}`);return val.trim(); };
 if (!Array.isArray(body.courseIds)||!body.courseIds.length||body.courseIds.length>100||body.courseIds.some(x=>typeof x!=='string'))throw new InvalidRecord('Selecciona cursos del catálogo');
 const amount=String(body.amount??''); if(!/^\d+(?:\.\d{1,2})?$/.test(amount)||Number(amount)<=0||Number(amount)>99999999.99)throw new InvalidRecord('Importe inválido');
 if(!Object.values(QuotationStatus).includes(body.status as QuotationStatus))throw new InvalidRecord('Estado inválido');
 const modality=body.modality||null;if(modality!==null&&!Object.values(ClassModality).includes(modality as ClassModality))throw new InvalidRecord('Modalidad inválida');
 const participants=body.participants===''||body.participants==null?null:Number(body.participants);if(participants!==null&&(!Number.isInteger(participants)||participants<1||participants>100000))throw new InvalidRecord('Cantidad de participantes inválida');
 const dates=body.tentativeDates??[];if(!Array.isArray(dates)||dates.length>366||dates.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)||!invoiceDate(d)))throw new InvalidRecord('Fechas tentativas inválidas');
 return {company:text('company',200,true),contact:text('contact',300),amount:new Prisma.Decimal(amount),participants,modality:modality as ClassModality|null,status:body.status as QuotationStatus,tentativeDates:[...new Set(dates as string[])].sort(),validUntil:invoiceDate(body.validUntil)||null,followUpDate:invoiceDate(body.followUpDate)||null,conditions:text('conditions',5000),notes:text('notes',5000),courseIds:[...new Set(body.courseIds as string[])]};
}
export function quotationDTO<T extends {status: string;validUntil:Date|null;serviceId:string|null;convertedAt:Date|null;documents:{id:string;name:string;size:number;pathname:string;state:string}[]}>(row:T) {
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return {...row,effectiveStatus:!row.convertedAt&&['DRAFT','SENT'].includes(row.status)&&row.validUntil&&row.validUntil.toISOString().slice(0,10)<today?'EXPIRED':row.status,documents:row.documents.map(({id,name,size})=>({id,name,size}))};
}
export async function lockQuotation(tx:Prisma.TransactionClient,id:string){ await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`quotation:${id}`}))::text`; }
