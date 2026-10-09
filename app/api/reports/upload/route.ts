import {NextResponse} from 'next/server';import {handleUpload,type HandleUploadBody} from '@vercel/blob/client';import {prisma} from '@/lib/prisma';import {reportActor,eligibleReportService,reportError,ReportError} from '@/lib/reports';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 const actor=await reportActor(),body=await req.json() as HandleUploadBody;
 if(body?.type!=='blob.generate-client-token')throw new ReportError('Solicitud de carga inválida');
 const response=await handleUpload({request:req,body,onBeforeGenerateToken:async(pathname,payload)=>{
  let id;try{id=JSON.parse(payload??'{}').documentId;}catch{throw new ReportError('Carga inválida');}
  const doc=await prisma.reportDocument.findFirst({where:{id:typeof id==='string'?id:'__none__',pathname,state:'PENDING',createdAt:{gt:new Date(Date.now()-86400000)},uploaderId:actor.id,report:{service:eligibleReportService}}});
  if(!doc)throw new ReportError('No puedes autorizar esta carga',403);
  return {allowedContentTypes:[doc.contentType],maximumSizeInBytes:doc.size,validUntil:Date.now()+180000,addRandomSuffix:false,allowOverwrite:false};
 }});return NextResponse.json(response);
 }catch(e){return reportError(e);}}
