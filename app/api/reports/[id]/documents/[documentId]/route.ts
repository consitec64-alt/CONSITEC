import {NextResponse} from 'next/server';import {head,del} from '@vercel/blob';import {prisma} from '@/lib/prisma';import {reportActor,reportService,eligibleReportService,reportError,ReportError} from '@/lib/reports';import {audit} from '@/lib/audit';
export const dynamic='force-dynamic';
export async function PATCH(_req:Request,{params}:{params:Promise<{id:string;documentId:string}>}){try{
 const actor=await reportActor(),{id,documentId}=await params;
 const doc=await prisma.reportDocument.findFirst({where:{id:documentId,uploaderId:actor.id,state:{in:['PENDING','READY']},report:{serviceId:id,service:eligibleReportService}}});if(!doc)throw new ReportError('Carga no disponible para esta cuenta',404);
 if(doc.state==='READY')return NextResponse.json({success:true});
 const blob=await head(doc.pathname);if(blob.pathname!==doc.pathname||blob.size!==doc.size||blob.contentType.split(';')[0]!==doc.contentType)throw new ReportError('El archivo subido no coincide con la carga autorizada');
 await prisma.$transaction(async tx=>{await reportService(tx,id);const before=await tx.reportDocument.findFirstOrThrow({where:{id:documentId,state:'PENDING',uploaderId:actor.id,report:{serviceId:id}}});const after=await tx.reportDocument.update({where:{id:documentId},data:{state:'READY',uploadedAt:new Date()}});await audit(tx,actor,'REPORT_DOCUMENT','CREATE',null,after);});return NextResponse.json({success:true});
 }catch(e){return reportError(e);}}
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string;documentId:string}>}){try{
 const actor=await reportActor(),{id,documentId}=await params;
 const doc=await prisma.$transaction(async tx=>{await reportService(tx,id);const before=await tx.reportDocument.findFirst({where:{id:documentId,report:{serviceId:id},...(actor.role==='ADMIN'?{}:{uploaderId:actor.id})}});if(!before)throw new ReportError('No puedes retirar este archivo',403);
 const report=await tx.serviceReport.findUniqueOrThrow({where:{serviceId:id}});if(before.category==='FINAL_REPORT'&&before.state==='READY'&&report.status==='DELIVERED'&&!report.finalReportUrl&&await tx.reportDocument.count({where:{reportId:report.id,state:'READY',category:'FINAL_REPORT'}})<=1)throw new ReportError('Cambia el informe a En revisión antes de retirar su último archivo final');
 const after=await tx.reportDocument.update({where:{id:documentId},data:{state:'DELETED'}});if(before.state!=='DELETED')await audit(tx,actor,'REPORT_DOCUMENT','DELETE',before,after);return after;});
 await del(doc.pathname);return NextResponse.json({success:true});
 }catch(e){return reportError(e);}}
