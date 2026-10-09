import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/current-user';
import {audit} from '@/lib/audit';
import {defaultWeekRanges,validateWeekRanges,weekDefinitions} from '@/lib/commercial-weeks';
import {parsePeriod,monthKey,assertMonthsOpen} from '@/lib/monthly-close';
import {InvalidRecord} from '@/lib/record-input';
import {recordError} from '@/lib/record-error';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const actor=await currentUser();if(!actor)return NextResponse.json({error:'Debes iniciar sesión'},{status:401});
 const q=new URL(req.url).searchParams,period=parsePeriod(q.get('year'),q.get('month'));if(!period)return NextResponse.json({error:'Mes y año inválidos'},{status:400});
 const id=monthKey(period),[plan,close]=await Promise.all([prisma.commercialWeekPlan.findUnique({where:{id}}),prisma.monthlyClose.findUnique({where:{id}})]);
 return NextResponse.json({id,weeks:weekDefinitions(plan?validateWeekRanges(plan.ranges,period):defaultWeekRanges(period)),updatedAt:plan?.updatedAt.toISOString()??null,custom:!!plan,closed:!!close?.closedAt});
}
export async function POST(req:Request){try{
 const actor=await currentUser();if(!actor)return NextResponse.json({error:'Debes iniciar sesión'},{status:401});if(actor.role!=='ADMIN')return NextResponse.json({error:'Solo administradores pueden configurar las semanas'},{status:403});
 const body=await req.json(),period=parsePeriod(body?.year,body?.month);if(!period||typeof body?.reset!=='boolean'||!(body.expectedUpdatedAt===null||typeof body.expectedUpdatedAt==='string'))throw new InvalidRecord('Solicitud inválida');
 let ranges;try{ranges=body.reset?defaultWeekRanges(period):validateWeekRanges(body.ranges,period);}catch(e){throw new InvalidRecord((e as Error).message);}
 const id=monthKey(period);
 const row=await prisma.$transaction(async tx=>{
  await assertMonthsOpen(tx,{serviceDate:new Date(id+'-01T09:00:00Z')});
  const before=await tx.commercialWeekPlan.findUnique({where:{id}});
  if((before?.updatedAt.toISOString()??null)!==body.expectedUpdatedAt)return null;
  if(body.reset){if(before)await tx.commercialWeekPlan.delete({where:{id}});await audit(tx,actor,'WEEK_PLAN','UPDATE',before,{id,ranges,updatedAt:null});return {id,weeks:weekDefinitions(ranges),updatedAt:null,custom:false,closed:false};}
  const after=await tx.commercialWeekPlan.upsert({where:{id},create:{id,ranges},update:{ranges}});
  await audit(tx,actor,'WEEK_PLAN',before?'UPDATE':'CREATE',before,after);
  return {id,weeks:weekDefinitions(ranges),updatedAt:after.updatedAt.toISOString(),custom:true,closed:false};
 });
 if(!row)return NextResponse.json({error:'Otro administrador cambió estas semanas. Actualiza los datos antes de guardar.'},{status:409});
 return NextResponse.json(row);
}catch(e){return recordError(e);}}
