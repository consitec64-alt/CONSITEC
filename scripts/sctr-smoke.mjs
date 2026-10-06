import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcrypt';
const database=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1'].includes(database.hostname)&&database.pathname==='/consitec','Use isolated local database');
const db=new PrismaClient(),tag='sctr-'+randomUUID(),password=randomUUID(),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3000';
let user,instructor;let checks=0;
async function api(path,cookie,method='GET',body){checks++;return fetch(new URL(path,base),{method,redirect:'manual',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function json(response,status=200){assert.equal(response.status,status,await response.clone().text());return response.json();}
try{
 user=await db.user.create({data:{username:tag,role:'SALES',password:await bcrypt.hash(password,12)}});
 instructor=await db.instructor.create({data:{name:tag,sctr:true,address:'Dirección preservada',dni:'DNI preservado',carPlate:'ABC-123'}});
 const path=`/api/metadata/instructors/${instructor.id}/sctr`,body={sctrStartsAt:'2026-10-06',sctrEndsAt:'2027-10-06'};
 await json(await api(path,null,'PATCH',body),401);
 const login=await api('/api/auth/login',null,'POST',{username:tag,password});await json(login);const cookie=login.headers.get('set-cookie').split(';')[0];
 for(const invalid of [{sctrStartsAt:''},{sctrEndsAt:''},{sctrStartsAt:'2026-02-30'},{sctrEndsAt:'2026-10-05'},{sctrStartsAt:123}])await json(await api(path,cookie,'PATCH',{...body,...invalid}),400);
 await json(await api(path,cookie,'PATCH',body));let saved=await db.instructor.findUniqueOrThrow({where:{id:instructor.id}});assert.equal(saved.sctrStartsAt.toISOString().slice(0,10),body.sctrStartsAt);assert.equal(saved.sctrEndsAt.toISOString().slice(0,10),body.sctrEndsAt);assert.equal(saved.address,instructor.address);assert.equal(saved.dni,instructor.dni);assert.equal(saved.carPlate,instructor.carPlate);
 const data=(await json(await api('/api/metadata/instructors',cookie))).find(i=>i.id===instructor.id);assert.equal(data.sctrEndsAt.slice(0,10),body.sctrEndsAt);
 await json(await api(path,cookie,'PATCH',{...body,sctrEndsAt:body.sctrStartsAt})); // Inclusive one-day validity.
 await json(await api(`/api/metadata/instructors/${instructor.id}`,cookie,'PATCH',{name:tag,sctr:false}));
 await json(await api(path,cookie,'PATCH',body),409);saved=await db.instructor.findUniqueOrThrow({where:{id:instructor.id}});assert.equal(saved.sctrEndsAt.toISOString().slice(0,10),body.sctrStartsAt,'Turning SCTR off keeps historical dates');
 await json(await api('/api/metadata/instructors/missing/sctr',cookie,'PATCH',body),404);
 const csrf=await fetch(new URL(path,base),{method:'PATCH',headers:{Cookie:cookie,Origin:'https://untrusted.example','Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(csrf.status,403);
 console.log(`SCTR smoke passed: ${checks} requests; authenticated date editing, valid/inclusive range, invalid dates, false-SCTR rejection, safe profile update, date retention and CSRF.`);
}finally{if(instructor)await db.instructor.deleteMany({where:{id:instructor.id}});if(user)await db.user.deleteMany({where:{id:user.id}});await db.$disconnect();}
