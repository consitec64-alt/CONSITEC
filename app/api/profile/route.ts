import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { encodeSession, SESSION_COOKIE, SESSION_SECONDS } from '@/lib/auth';
export const dynamic='force-dynamic';
export async function PATCH(req:Request){try{
 const actor=await currentUser();if(!actor)return NextResponse.json({error:'Debes iniciar sesión'},{status:401});
 const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:'Solicitud inválida'},{status:400});
 const {avatar,textSize,password,currentPassword}=body;
 if(avatar!==undefined && avatar!==null && (typeof avatar!=='string'||avatar.length>210000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar)))return NextResponse.json({error:'Usa una foto PNG, JPEG o WebP de hasta 150 KB'},{status:400});
 if(typeof avatar==='string'){
  const bytes=Buffer.from(avatar.split(',')[1],'base64'),type=avatar.slice(11,avatar.indexOf(';'));
  const valid=type==='jpeg'?bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(!valid||bytes.length>150*1024)return NextResponse.json({error:'La foto no es una imagen válida o supera 150 KB'},{status:400});
 }
 if(textSize!==undefined&&!['normal','large','extra'].includes(textSize))return NextResponse.json({error:'Tamaño de texto inválido'},{status:400});
 if(password!==undefined&&(typeof password!=='string'||password.length<12||Buffer.byteLength(password)>72))return NextResponse.json({error:'La contraseña debe tener al menos 12 caracteres y como máximo 72 bytes'},{status:400});
 if(actor.mustChangePassword&&password===undefined)return NextResponse.json({error:'Cambia primero tu contraseña temporal'},{status:400});
 if(password!==undefined){const user=await prisma.user.findUniqueOrThrow({where:{id:actor.id}});if(typeof currentPassword!=='string'||Buffer.byteLength(currentPassword)>72||!await bcrypt.compare(currentPassword,user.password))return NextResponse.json({error:'La contraseña actual no es correcta'},{status:400});if(await bcrypt.compare(password,user.password))return NextResponse.json({error:'Elige una contraseña distinta a la temporal o actual'},{status:400});}
 const hashed=password!==undefined?await bcrypt.hash(password,12):undefined;
 const saved=await prisma.$transaction(async tx=>{const row=await tx.user.update({where:{id:actor.id,sessionVersion:actor.sessionVersion},data:{...(avatar!==undefined?{avatar}:{}),...(textSize!==undefined?{textSize}:{}),...(hashed?{password:hashed,mustChangePassword:false,sessionVersion:{increment:1}}:{})},select:{displayName:true,id:true,username:true,role:true,avatar:true,textSize:true,mustChangePassword:true,sessionVersion:true}});await audit(tx,actor,'USER',hashed?'PASSWORD_CHANGE':'PROFILE_UPDATE',{id:actor.id},{id:row.id,username:row.username,textSize:row.textSize,hasPhoto:!!row.avatar});return row;});
 const res=NextResponse.json(saved);res.headers.set('Cache-Control','private, no-store');if(hashed){res.cookies.set(SESSION_COOKIE,await encodeSession({userId:saved.id,username:saved.username,role:saved.role,sessionVersion:saved.sessionVersion}),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:SESSION_SECONDS});}return res;
}catch{return NextResponse.json({error:'No se pudo guardar el perfil. Actualiza la sesión e inténtalo nuevamente.'},{status:503});}
}
