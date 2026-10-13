import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { validateDraft } from '@/lib/service-draft';
export const dynamic = 'force-dynamic';
async function actor() { const user = await currentUser(); return user && ['ADMIN','SALES'].includes(user.role) ? user : null; }
export async function GET() {
  const user = await actor(); if (!user) return NextResponse.json({error:'Acceso no permitido'},{status:403});
  const row = await prisma.user.findUniqueOrThrow({where:{id:user.id},select:{serviceDraft:true}});
  return NextResponse.json({draft:row.serviceDraft},{headers:{'Cache-Control':'private, no-store'}});
}
export async function PUT(req: Request) {
  const user = await actor(); if (!user) return NextResponse.json({error:'Acceso no permitido'},{status:403});
  let values;
  try { values = validateDraft(await req.json()); } catch (error) { return NextResponse.json({error:error instanceof Error ? error.message : 'Borrador inválido'},{status:400}); }
  const draft = {values,updatedAt:new Date().toISOString()};
  await prisma.user.update({where:{id:user.id,sessionVersion:user.sessionVersion},data:{serviceDraft:draft}});
  return NextResponse.json({draft},{headers:{'Cache-Control':'private, no-store'}});
}
export async function DELETE(req: Request) {
  const user = await actor(); if (!user) return NextResponse.json({error:'Acceso no permitido'},{status:403});
  const body = await req.json().catch(()=>null);
  if (typeof body?.updatedAt !== 'string') return NextResponse.json({error:'Identifica el borrador que quieres retirar'},{status:400});
  const result = await prisma.user.updateMany({where:{id:user.id,serviceDraft:{path:['updatedAt'],equals:body.updatedAt}},data:{serviceDraft:Prisma.DbNull}});
  return NextResponse.json({removed:result.count>0},{headers:{'Cache-Control':'private, no-store'}});
}
