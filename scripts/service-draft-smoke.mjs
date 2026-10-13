import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const db=new PrismaClient(),users=[],password=randomUUID(),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3025';
assert(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)&&new URL(process.env.DATABASE_URL).pathname==='/consitec');
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
async function api(cookie,method='GET',body,status=200,extra={}){const r=await fetch(base+'/api/service-draft',{method,headers:{...(cookie?{cookie}:{}),'Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,status,await r.clone().text());return r.json();}
try{
 const hash=await bcrypt.hash(password,10);for(const role of ['SALES','SALES','ADMIN','SUPERVISOR'])users.push(await db.user.create({data:{username:'draft-'+randomUUID(),password:hash,role,tutorialCompleted:true,...(role==='SUPERVISOR'?{displayName:'Draft supervisor'}:{})}}));
 const cookies=[];for(const user of users){const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user.username,password})});assert.equal(r.status,200);cookies.push(r.headers.get('set-cookie').split(';')[0]);}
 const count=await db.service.count();await api(null,'GET',undefined,401);await api(cookies[3],'GET',undefined,403);await api(cookies[3],'PUT',{company:'test'},403);await api(cookies[0],'PUT',{company:'test'},403,{origin:'https://untrusted.example'});
 const values={company:'Incompleto',courseIds:[],instructorIds:[],modality:'',amount:'',sessions:JSON.stringify([{date:'',startTime:'',endTime:'',modality:''}])};
 const first=(await api(cookies[0],'PUT',values)).draft;assert.deepEqual((await api(cookies[0])).draft.values,values);assert.equal((await api(cookies[1])).draft,null);assert.equal((await api(cookies[1],'DELETE',{updatedAt:first.updatedAt})).removed,false);
 for(const value of [{userId:users[1].id},{company:'x'.repeat(1001)},{courseIds:['x',42]},{sessions:'broken'}])await api(cookies[0],'PUT',value,400);
 const latest=(await api(cookies[0],'PUT',{...values,company:'Nueva versión'})).draft;assert.equal((await api(cookies[0],'DELETE',{updatedAt:first.updatedAt})).removed,false);assert.equal((await api(cookies[0])).draft.values.company,'Nueva versión');assert.equal((await api(cookies[0],'DELETE',{updatedAt:latest.updatedAt})).removed,true);assert.equal((await api(cookies[0])).draft,null);
 assert((await api(cookies[2],'PUT',{company:'Borrador admin'})).draft);assert.equal(await db.service.count(),count);
 console.log('PASS service drafts: incomplete data, account persistence/isolation, authorization, CSRF, invalid payloads, stale-delete protection and no services created.');
}finally{await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await db.$disconnect();}
