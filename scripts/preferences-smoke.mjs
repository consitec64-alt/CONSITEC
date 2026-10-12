import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const url=new URL(process.env.DATABASE_URL);assert(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/consitec');
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3012';assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const db=new PrismaClient(),tag='preferences-'+randomUUID(),password=randomUUID(),users=[];
async function login(user){const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user.username,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
async function update(cookie,preferences,status=200){const r=await fetch(base+'/api/profile',{method:'PATCH',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({preferences})});assert.equal(r.status,status,await r.clone().text());return r.json();}
try{
 const hash=await bcrypt.hash(password,10);
 for(const role of ['ADMIN','SALES','SUPERVISOR'])users.push(await db.user.create({data:{username:tag+role,password:hash,role,tutorialCompleted:true,...(role==='SUPERVISOR'?{displayName:tag}:{})}}));
 const sc=await login(users[1]),vc=await login(users[2]);
 const prefs={theme:'dark',homeView:'quotations',compactSidebar:true,favorites:['services','quotations'],classReminder:'compact'};
 assert.deepEqual((await update(sc,prefs)).preferences,prefs);
 assert.deepEqual((await update(sc,{theme:'light'})).preferences,{...prefs,theme:'light'});
 const cookie=await login(users[1]);const me=await(await fetch(base+'/api/auth/me',{headers:{cookie}})).json();assert.deepEqual(me.preferences,{...prefs,theme:'light'});
 assert.deepEqual((await db.user.findUnique({where:{id:users[0].id}})).preferences,{});
 for(const bad of [{theme:'bad'},{theme:['dark']},{compactSidebar:'yes'},{homeView:'unknown'},{favorites:['users']},{favorites:['summary','services','quotations','instructors','support','history']},{classReminder:'off'},{role:'ADMIN'}])await update(sc,bad,400);
 await update(vc,{homeView:'quotations'},400);await update(vc,{favorites:['certificates']},400);
 assert.equal((await update(vc,{homeView:'instructors',favorites:['services'],classReminder:'compact'})).preferences.homeView,'instructors');
 assert.equal((await db.user.findUnique({where:{id:users[1].id}})).role,'SALES');
 console.log('PASS preferences: persistence across sessions, partial updates, independent users, role restrictions and invalid payloads.');
}finally{await db.auditLog.deleteMany({where:{actorId:{in:users.map(u=>u.id)}}});await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await db.$disconnect();}
