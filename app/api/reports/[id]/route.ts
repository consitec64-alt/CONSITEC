import {NextResponse} from 'next/server';import {ReportStatus} from '@prisma/client';
import {prisma} from '@/lib/prisma';import {reportActor,eligibleReportService,reportService,reportDate,reportLink,reportError,ReportError} from '@/lib/reports';import {audit} from '@/lib/audit';import {limaToday} from '@/lib/monthly-close';
export const dynamic='force-dynamic';
const include={assignee:{select:{id:true,username:true}},documents:{where:{state:{not:'DELETED'}},orderBy:{createdAt:'desc' as const},select:{id:true,name:true,contentType:true,size:true,category:true,sessionDate:true,uploaderName:true,state:true,uploadedAt:true,uploaderId:true}}};
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){try{await reportActor();const {id}=await params;const service=await prisma.service.findFirst({where:{id,...eligibleReportService},select:{id:true,company:true,correlativeCode:true,status:true,serviceDate:true,modality:true,course:{select:{name:true}},courses:{select:{name:true}},dates:{orderBy:{date:'asc'},select:{date:true,startTime:true,endTime:true}},instructor:{select:{name:true}},location:{select:{department:true,district:true}},report:{include}}});if(!service)throw new ReportError('Servicio no disponible en la agenda de informes',404);return NextResponse.json(service);}catch(e){return reportError(e);}}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){try{
 const actor=await reportActor(),{id}=await params,body=await req.json();
 if(!body||!Object.values(ReportStatus).includes(body.status)||typeof body.notes!=='string'||body.notes.length>5000)throw new ReportError('Estado u observaciones inválidos');
 const assigneeId=body.assigneeId||null;if(assigneeId&&(typeof assigneeId!=='string'||!await prisma.user.findFirst({where:{id:assigneeId,role:{in:['ADMIN','REPORTS']}}})))throw new ReportError('Selecciona un encargado de informes o administrador');
 const data={status:body.status as ReportStatus,assigneeId,dueDate:reportDate(body.dueDate??null),deliveredAt:body.status==='DELIVERED'?reportDate(body.deliveredAt||limaToday()):null,notes:body.notes.trim(),folderUrl:reportLink(body.folderUrl),finalReportUrl:reportLink(body.finalReportUrl)};
 const saved=await prisma.$transaction(async tx=>{
  const service=await reportService(tx,id),before=await tx.serviceReport.findUnique({where:{serviceId:id},include:{assignee:{select:{id:true,username:true}}}});
  if(data.status==='DELIVERED'&&!data.finalReportUrl&&!(before&&await tx.reportDocument.count({where:{reportId:before.id,state:'READY',category:'FINAL_REPORT'}})))throw new ReportError('Adjunta el informe final o su enlace antes de marcar Entregado');
  const after=await tx.serviceReport.upsert({where:{serviceId:id},create:{serviceId:id,...data},update:data,include});
  await audit(tx,actor,'REPORT',before?'UPDATE':'CREATE',before?{...before,company:service.company}:null,{...after,company:service.company});return after;
 });return NextResponse.json(saved);
 }catch(e){return reportError(e);}}
