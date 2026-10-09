import {get} from '@vercel/blob';import {prisma} from '@/lib/prisma';import {reportActor,eligibleReportService,reportError,ReportError} from '@/lib/reports';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{documentId:string}>}){try{
 await reportActor();const {documentId}=await params;const doc=await prisma.reportDocument.findFirst({where:{id:documentId,state:'READY',report:{service:eligibleReportService}}});if(!doc)throw new ReportError('Documento no disponible',404);
 const blob=await get(doc.pathname,{access:'private',useCache:false});if(!blob||blob.statusCode!==200)throw new ReportError('Archivo no encontrado',404);
 const download=new URL(req.url).searchParams.has('download');const inline=!download&&['application/pdf','image/jpeg','image/png','image/webp'].includes(doc.contentType);
 return new Response(blob.stream,{headers:{'Content-Type':doc.contentType,'Content-Disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'"}});
 }catch(e){return reportError(e);}}
