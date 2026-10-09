import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
export const dynamic='force-dynamic';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await currentUser();if(actor?.role!=='ADMIN')return NextResponse.json({error:'Solo administradores'},{status:403});
 const {id}=await params;if(id===actor.id)return NextResponse.json({error:'Cambia tu propia contraseña desde Mi perfil'},{status:400});
 const body=await req.json().catch(()=>null),password=body?.password;
 if(typeof password!=='string'||password.length<12||Buffer.byteLength(password)>72)return NextResponse.json({error:'Usa al menos 12 caracteres y como máximo 72 bytes'},{status:400});
 const hashed=await bcrypt.hash(password,12);
 try{await prisma.$transaction(async tx=>{await tx.user.update({where:{id},data:{password:hashed,mustChangePassword:true,sessionVersion:{increment:1}}});await audit(tx,actor,'USER','PASSWORD_RESET',{id},{id});});return NextResponse.json({success:true});}catch{return NextResponse.json({error:'No se pudo restablecer la cuenta'},{status:503});}
}
