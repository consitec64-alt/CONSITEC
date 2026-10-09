import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import {reportActor,eligibleReportService,reportError} from '@/lib/reports';
import {agendaWhere} from '@/lib/service-scheduling';
import {parsePeriod,limaToday} from '@/lib/monthly-close';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 await reportActor();const q=new URL(req.url).searchParams,[year,month]=limaToday().split('-').map(Number);
 const period=parsePeriod(q.get('year')??year,q.get('month')??month);if(!period)return NextResponse.json({error:'Mes y año inválidos'},{status:400});
 const search=(q.get('search')??'').slice(0,200),status=q.get('status');if(status&&!['PENDING','IN_PROGRESS','IN_REVIEW','DELIVERED'].includes(status))return NextResponse.json({error:'Estado inválido'},{status:400});
 const page=Math.max(1,Math.min(10000,Math.floor(Number(q.get('page'))||1)));
 const start=new Date(Date.UTC(period.year,period.month-1,1)),end=new Date(Date.UTC(period.year,period.month,1));
 const where:Prisma.ServiceWhereInput={AND:[eligibleReportService,agendaWhere(start,end),...(search?[{OR:[{company:{contains:search,mode:'insensitive' as const}},{correlativeCode:{contains:search}},{instructor:{name:{contains:search,mode:'insensitive' as const}}},{courses:{some:{name:{contains:search,mode:'insensitive' as const}}}}]}]:[]),...(status?[status==='PENDING'?{OR:[{report:null},{report:{status:'PENDING' as const}}]}:{report:{status:status as 'IN_PROGRESS'|'IN_REVIEW'|'DELIVERED'}}]:[]),...(q.get('assignee')?[{report:{assigneeId:q.get('assignee')!}}]:[])]};
 const [services,total,assignees]=await Promise.all([prisma.service.findMany({where,orderBy:[{serviceDate:'desc'},{id:'asc'}],skip:(page-1)*50,take:50,select:{id:true,company:true,correlativeCode:true,status:true,serviceDate:true,modality:true,course:{select:{name:true}},courses:{select:{name:true}},instructor:{select:{name:true}},location:{select:{department:true,district:true}},dates:{orderBy:{date:'asc'},select:{date:true,startTime:true,endTime:true}},report:{select:{status:true,assigneeId:true,dueDate:true,deliveredAt:true,_count:{select:{documents:{where:{state:'READY'}}}}}}}}),prisma.service.count({where}),prisma.user.findMany({where:{role:{in:['ADMIN','REPORTS']}},select:{id:true,username:true},orderBy:{username:'asc'}})]);
 return NextResponse.json({rows:services.map(s=>({...s,reportStatus:s.report?.status??'PENDING'})),total,page,assignees,uploadsEnabled:!!process.env.BLOB_READ_WRITE_TOKEN});
 }catch(e){return reportError(e);}}
