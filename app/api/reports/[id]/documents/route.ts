import {audit} from '@/lib/audit';
import {NextResponse} from 'next/server';import {randomUUID} from 'node:crypto';import {prisma} from '@/lib/prisma';import {reportActor,reportService,reportDate,reportError,ReportError} from '@/lib/reports';import {FILE_LIMIT,REPORT_CATEGORIES,REPORT_MIMES} from '@/lib/report-files';
export const dynamic='force-dynamic';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{
 const actor=await reportActor(),{id}=await params,b=await req.json();if(!process.env.BLOB_READ_WRITE_TOKEN)throw new ReportError('El almacenamiento de archivos aún no está configurado',503);
 if(!b||typeof b.name!=='string'||!b.name.trim()||b.name.length>180||/[\x00-\x1f]/.test(b.name)||!Number.isInteger(b.size)||b.size<1||b.size>FILE_LIMIT||typeof b.contentType!=="string"||!Object.hasOwn(REPORT_MIMES,b.contentType)||!REPORT_MIMES[b.contentType].includes(b.name.split('.').pop()?.toLowerCase())||typeof b.category!=="string"||!Object.hasOwn(REPORT_CATEGORIES,b.category))throw new ReportError('Archivo inválido. Usa PDF, Word, Excel, JPG, PNG o WebP de hasta 10 MB');
 const sessionDate=reportDate(b.sessionDate??null);
 const document=await prisma.$transaction(async tx=>{
  const service=await reportService(tx,id);if(sessionDate&&![service.serviceDate,...service.dates.map(d=>d.date)].some(d=>d.toISOString().slice(0,10)===sessionDate.toISOString().slice(0,10)))throw new ReportError('La jornada no pertenece al servicio');
  const previous=await tx.serviceReport.findUnique({where:{serviceId:id}});
  const report=await tx.serviceReport.upsert({where:{serviceId:id},create:{serviceId:id},update:{}});
  if(!previous)await audit(tx,actor,'REPORT','CREATE',null,{...report,company:service.company});
  return tx.reportDocument.create({data:{reportId:report.id,name:b.name.trim(),contentType:b.contentType,size:b.size,category:b.category,sessionDate,uploaderId:actor.id,uploaderName:actor.username,pathname:`reports/${id}/${randomUUID()}.${b.name.split('.').pop()!.toLowerCase()}`},select:{id:true,pathname:true}});
 });return NextResponse.json(document,{status:201});
 }catch(e){return reportError(e);}}
