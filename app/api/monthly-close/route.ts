import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';
import { audit } from '@/lib/audit';
import { canClose, limaToday, lockMonths, monthKey, parsePeriod } from '@/lib/monthly-close';
import { recordError } from '@/lib/record-error';
export const dynamic='force-dynamic';
export async function GET(req: Request) {
  const actor=await currentUser();if(!actor)return NextResponse.json({error:'Debes iniciar sesión'},{status:401});
  const query=new URL(req.url).searchParams, period=parsePeriod(query.get('year'),query.get('month'));
  if(!period)return NextResponse.json({error:'Mes y año inválidos'},{status:400});
  const row=await prisma.monthlyClose.findUnique({where:{id:monthKey(period)}});
  let pending: string[]=[];
  if(actor.role==='ADMIN') {
    const months=await prisma.$queryRaw<{month:string}[]>`SELECT DISTINCT TO_CHAR(d, 'YYYY-MM') AS month FROM (
      SELECT "serviceDate" AS d FROM "Service" WHERE "deletedAt" IS NULL
      UNION SELECT sd.date AS d FROM "ServiceDay" sd JOIN "Service" s ON s.id=sd."serviceId" WHERE s."deletedAt" IS NULL
      UNION SELECT COALESCE("invoicedAt", "serviceDate") AS d FROM "Service" WHERE "deletedAt" IS NULL AND status='INVOICED'
      UNION SELECT "saleDate" AS d FROM "CertificateSale" WHERE "deletedAt" IS NULL
      UNION SELECT COALESCE("invoicedAt", "saleDate") AS d FROM "CertificateSale" WHERE "deletedAt" IS NULL AND status='INVOICED'
    ) periods ORDER BY month DESC`;
    const closed=new Set((await prisma.monthlyClose.findMany({where:{closedAt:{not:null}},select:{id:true}})).map(r=>r.id));
    pending=months.map(r=>r.month).filter(key=>{const [year,month]=key.split('-').map(Number);return year>=2000&&year<=2100&&canClose({year,month})&&!closed.has(key);});
    const [currentYear,currentMonth]=limaToday().split('-').map(Number);
    const current={year:currentYear,month:currentMonth},currentKey=monthKey(current);
    if(canClose(current)&&!closed.has(currentKey)&&!pending.includes(currentKey))pending.unshift(currentKey);
    if(canClose(period)&&!row?.closedAt&&!pending.includes(monthKey(period)))pending.unshift(monthKey(period));
  }
  return NextResponse.json({id:monthKey(period),closedAt:row?.closedAt??null,closedByName:row?.closedByName??null,canClose:canClose(period),today:limaToday(),pending});
}
export async function POST(req: Request) {
  try {
    const actor=await currentUser();if(!actor)return NextResponse.json({error:'Debes iniciar sesión'},{status:401});
    if(actor.role!=='ADMIN')return NextResponse.json({error:'Solo administradores pueden cerrar o reabrir meses'},{status:403});
    const body=await req.json();
    if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Solicitud inválida'},{status:400});
    const period=parsePeriod(body.year,body.month);
    if(!period||!['CLOSE','REOPEN'].includes(body.action))return NextResponse.json({error:'Solicitud inválida'},{status:400});
    if(body.action==='CLOSE'&&!canClose(period))return NextResponse.json({error:'El cierre estará disponible desde el último día del mes, según la hora de Perú'},{status:400});
    const id=monthKey(period);
    const result=await prisma.$transaction(async tx=>{
      await lockMonths(tx,[id]);const before=await tx.monthlyClose.findUnique({where:{id}});
      if((body.action==='CLOSE'&&before?.closedAt)||(body.action==='REOPEN'&&!before?.closedAt))return null;
      const after=await tx.monthlyClose.upsert({where:{id},create:{id,closedAt:new Date(),closedBy:actor.id,closedByName:actor.username},update:body.action==='CLOSE'?{closedAt:new Date(),closedBy:actor.id,closedByName:actor.username}:{closedAt:null,closedBy:null,closedByName:null}});
      await audit(tx,actor,'MONTH',body.action,before,after);return after;
    });
    if(!result)return NextResponse.json({error:body.action==='CLOSE'?'El mes ya estaba cerrado':'El mes ya estaba abierto'},{status:409});
    return NextResponse.json(result);
  }catch(error){return recordError(error);}
}
