import { Prisma } from '@prisma/client';
import { audit, Actor } from '@/lib/audit';
import { assertInstructorsAvailable } from '@/lib/service-scheduling';
import { assertMonthsOpen } from '@/lib/monthly-close';

export async function syncCertificateAgenda(tx: Prisma.TransactionClient, sale: {id:string;customerType:string;customerName:string;amount:Prisma.Decimal;saleDate:Date;status:string;invoicedAt:Date|null;correlativeCode:string|null;courseId:string;salespersonId:string;deletedAt:Date|null}, courseIds:string[], actor:Actor) {
 const before=await tx.service.findUnique({where:{certificateSaleId:sale.id},include:{dates:true,courses:true,instructors:true}});
 const eligible=sale.customerType==='COMPANY'&&sale.amount.greaterThan(700)&&!sale.deletedAt;
 if(before)await assertMonthsOpen(tx,before);
 if(!eligible){if(before&&!before.deletedAt){const after=await tx.service.update({where:{id:before.id},data:{deletedAt:new Date()},include:{dates:true,courses:true}});await audit(tx,actor,'SERVICE','TRASH',before,after);}return;}
 const data={company:sale.customerName,amount:sale.amount,serviceDate:sale.saleDate,status:sale.status==='INVOICED'?'INVOICED' as const:'SCHEDULED' as const,invoicedAt:sale.invoicedAt,certificatesOnly:true,correlativeCode:sale.correlativeCode,courseId:sale.courseId,salespersonId:sale.salespersonId,deletedAt:null};
 await assertMonthsOpen(tx,data);
 if(before){const instructorIds=[...new Set([before.instructorId,...before.instructors.map(i=>i.id)].filter((id):id is string=>!!id))];await assertInstructorsAvailable(tx,instructorIds,[sale.saleDate],before.id);}
 const after=before?await tx.service.update({where:{id:before.id},data:{...data,courses:{set:courseIds.map(id=>({id}))},dates:{deleteMany:{},create:{date:sale.saleDate}}},include:{courses:true,dates:true}}):await tx.service.create({data:{...data,certificateSaleId:sale.id,courses:{connect:courseIds.map(id=>({id}))},dates:{create:{date:sale.saleDate}}},include:{courses:true,dates:true}});
 await audit(tx,actor,'SERVICE',before?'UPDATE':'CREATE',before,after);
}
