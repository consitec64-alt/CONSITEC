import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const url = new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1'].includes(url.hostname) && url.pathname === '/consitec');
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3011';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const db = new PrismaClient(), tag = 'daily-' + randomUUID(), password = randomUUID();
const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
const part = type => parts.find(p=>p.type===type).value;
const day = `${part('year')}-${part('month')}-${part('day')}`, today = new Date(day+'T09:00:00Z'), tomorrow = new Date(today.getTime()+86400000);
const users = [], reps = [], records = [];
let course;
async function login(user) {
 const r = await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user.username,password})});
 assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];
}
async function remind(cookie) {
 const r = await fetch(base+'/api/daily-classes',{method:'POST',headers:cookie?{cookie}:{}});
 return {status:r.status,...await r.json()};
}
try {
 for(let i=0;i<2;i++) reps.push(await db.salesperson.create({data:{name:tag+i}}));
 course = await db.course.create({data:{name:tag}});
 const hash=await bcrypt.hash(password,10);
 for(const [i,role] of ['SALES','SALES','ADMIN','SUPERVISOR'].entries()) users.push(await db.user.create({data:{username:tag+role+i,password:hash,role,tutorialCompleted:true,...(i<2?{salespersonId:reps[i].id}:role==='SUPERVISOR'?{displayName:tag}:{})}}));
 const common={company:tag,courseId:course.id,amount:100,status:'SCHEDULED',serviceDate:today};
 for(const data of [
  {...common,salespersonId:reps[0].id,modality:'MIXED',dates:{create:[{date:today,modality:'VIRTUAL',startTime:'09:00',endTime:'12:00'},{date:tomorrow,modality:'IN_PERSON'}]}},
  {...common,company:tag+' other commercial',salespersonId:reps[1].id},
  {...common,company:tag+' tomorrow',salespersonId:reps[0].id,serviceDate:tomorrow,dates:{create:{date:tomorrow}}},
  {...common,company:tag+' deleted',salespersonId:reps[0].id,deletedAt:new Date()},
  {...common,company:tag+' certificate',salespersonId:reps[0].id,certificatesOnly:true}
 ])records.push(await db.service.create({data}));
 assert.equal((await remind()).status,401);
 const ac=await login(users[2]);assert.equal((await remind(ac)).reminder,null);
 const vc=await login(users[3]);assert.equal((await remind(vc)).status,403);
 const sc=await login(users[0]);const responses=await Promise.all([remind(sc),remind(sc)]);
 const nonempty=responses.filter(r=>r.reminder);assert.equal(nonempty.length,1);
 const result=nonempty[0].reminder;assert.equal(result.day,day);
 for(const id of records.slice(0,2).map(r=>r.id))assert(result.classes.some(c=>c.id===id));
 for(const id of records.slice(2).map(r=>r.id))assert(!result.classes.some(c=>c.id===id));
 const mixed=result.classes.find(c=>c.id===records[0].id);assert.equal(mixed.modality,'VIRTUAL');assert.equal(mixed.startTime,'09:00');
 assert.equal((await remind(sc)).reminder,null);
 const newCookie=await login(users[0]);assert.equal((await remind(newCookie)).reminder,null);
 await db.user.update({where:{id:users[0].id},data:{dailyClassesSeenOn:'2000-01-01'}});assert((await remind(sc)).reminder);
 // A separate user linked to a different commercial sees the entire team's agenda.
 assert((await remind(await login(users[1]))).reminder.classes.some(c=>c.id===records[0].id));
 console.log('PASS daily classes API: Peru date, all commercials, current day only, multi-day modality, legacy dates, deleted/certificate exclusions, independent users, concurrent once-per-day claim and next-day eligibility.');
} finally {
 await db.service.deleteMany({where:{id:{in:records.map(r=>r.id)}}});
 await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});
 if(course)await db.course.delete({where:{id:course.id}});
 await db.salesperson.deleteMany({where:{id:{in:reps.map(r=>r.id)}}});
 await db.$disconnect();
}
