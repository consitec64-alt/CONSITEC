import { Prisma } from '@prisma/client';
import { currentUser } from '@/lib/current-user';
import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { prisma } from '@/lib/prisma';
export class ReportError extends Error{constructor(message:string,public status=400){super(message);}}
export async function reportActor(){const actor=await currentUser();if(!actor)throw new ReportError('Debes iniciar sesión',401);if(!['ADMIN','REPORTS'].includes(actor.role))throw new ReportError('Solo encargados de informes y administradores',403);return actor;}
export const eligibleReportService:Prisma.ServiceWhereInput={deletedAt:null,certificatesOnly:false,status:{in:['EXECUTED','INVOICED']}};
export async function reportService(tx:Prisma.TransactionClient,id:string){
 await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))::text`;
 const service=await tx.service.findFirst({where:{id,...eligibleReportService},include:{dates:true}});
 if(!service)throw new ReportError('El servicio no está disponible: debe estar Ejecutado o Facturado y fuera de papelera',404);
 return service;
}
export function reportDate(value:unknown){if(value===null||value==='')return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new ReportError('Fecha inválida');const d=new Date(value+'T09:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw new ReportError('Fecha inválida');return d;}
export function reportLink(value:unknown){if(value==null||value==='')return null;if(typeof value!=='string'||value.length>2000)throw new ReportError('Enlace inválido');try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error();return u.toString();}catch{throw new ReportError('Usa un enlace HTTPS válido');}}
export function reportError(e:unknown){if(e instanceof ReportError)return NextResponse.json({error:e.message},{status:e.status});if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2025')return NextResponse.json({error:'El registro ya no existe'},{status:404});return NextResponse.json({error:'No se pudo completar la operación de informes. Inténtalo nuevamente.'},{status:503});}
export async function cleanupReportFiles(){
 const rows=await prisma.reportDocument.findMany({where:{OR:[{reportId:null},{state:'DELETED'},{state:'PENDING',createdAt:{lt:new Date(Date.now()-86400000)}}]},select:{id:true,pathname:true},take:100});
 if(!rows.length)return;
 await del(rows.map(r=>r.pathname));await prisma.reportDocument.deleteMany({where:{id:{in:rows.map(r=>r.id)}}});
}
