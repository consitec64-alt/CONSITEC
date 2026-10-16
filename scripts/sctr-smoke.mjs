import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
import {SignJWT} from 'jose';
const database=process.env.TEST_DATABASE_URL,base=process.env.TEST_BASE_URL,secret=process.env.AUTH_SECRET;
assert(database&&base&&secret&&['localhost','127.0.0.1'].includes(new URL(database).hostname)&&['localhost','127.0.0.1'].includes(new URL(base).hostname),'Use TEST_DATABASE_URL and TEST_BASE_URL for an isolated local database/server, plus matching AUTH_SECRET');
const db=new PrismaClient({datasources:{db:{url:database}}}),tag='shared-sctr-'+randomUUID();
let checks=0;
async function token(user){return new SignJWT({username:user.username,role:user.role,sessionVersion:0}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuer('consitec').setAudience('consitec-panel').setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(secret));}
async function main(){
 const user=await db.user.create({data:{username:tag,role:'SALES',password:'unused-test-fixture',tutorialCompleted:true}});
 const supervisor=await db.user.create({data:{username:tag+'-supervisor',role:'SUPERVISOR',password:'unused-test-fixture',tutorialCompleted:true}});
 const cookie='consitec_session='+await token(user),supervisorCookie='consitec_session='+await token(supervisor);
 async function api(path,body,method=body?'PATCH':'GET',status=200,auth=cookie,headers={}){
  const r=await fetch(base+path,{method,redirect:'manual',headers:{...(auth?{Cookie:auth}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);checks++;return data;
 }
 const add=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 const today=(await api('/api/sctr')).today;
 const profile={name:tag+' instructor',sctr:true,address:'Preserved address',dni:'Preserved DNI',carPlate:'ABC-123'};
 const one=await api('/api/metadata/instructors',profile,'POST',201);
 const off=await api('/api/metadata/instructors',{name:tag+' second',sctr:false},'POST',201);
 const before=(await api('/api/sctr')).instructorCount;
 const body={sctrStartsAt:add(today,-20),sctrEndsAt:add(today,7)};
 await api('/api/sctr',body,'PATCH',401,null);
 await api('/api/sctr',undefined,'GET',403,supervisorCookie);
 await api('/api/sctr',body,'PATCH',403,supervisorCookie);
 for(const invalid of [{sctrStartsAt:''},{sctrEndsAt:''},{sctrStartsAt:'2026-02-30'},{sctrEndsAt:add(today,-21)},{sctrStartsAt:123}])await api('/api/sctr',{...body,...invalid},'PATCH',400);
 await api('/api/sctr',body);
 let state=await api('/api/sctr');assert.equal(state.status,'EXPIRING');assert.equal(state.daysLeft,7);assert.equal(state.remindOn,today);
 await api(`/api/metadata/instructors/${off.id}`,{name:off.name,sctr:true});
 state=await api('/api/sctr');assert.equal(state.instructorCount,before+1);assert.equal(state.policy.sctrEndsAt.slice(0,10),body.sctrEndsAt);
 assert.equal(await db.sctrPolicy.count(),1);
 const preserved=await db.instructor.findUniqueOrThrow({where:{id:one.id}});for(const field of ['address','dni','carPlate'])assert.equal(preserved[field],profile[field]);
 const old=await api(`/api/metadata/instructors/${one.id}/sctr`,{sctrStartsAt:'2098-01-01',sctrEndsAt:'2098-01-31'},'PATCH',409);assert.equal(old.code,'SHARED_SCTR_POLICY');assert.equal((await api('/api/sctr')).policy.sctrEndsAt.slice(0,10),body.sctrEndsAt);
 await api('/api/sctr',{...body,sctrEndsAt:today});state=await api('/api/sctr');assert.equal(state.status,'EXPIRING');assert.equal(state.daysLeft,0);
 await api('/api/sctr',{...body,sctrEndsAt:add(today,-1)});state=await api('/api/sctr');assert.equal(state.status,'EXPIRED');assert.equal(state.instructorCount,before+1);assert.equal((await db.instructor.findUniqueOrThrow({where:{id:one.id}})).sctr,true);
 await api(`/api/metadata/instructors/${off.id}`,{name:off.name,sctr:false});assert.equal((await api('/api/sctr')).instructorCount,before);
 const renewed={sctrStartsAt:today,sctrEndsAt:add(today,30)};
 await Promise.all([api('/api/sctr',renewed),api('/api/sctr',{...renewed,sctrEndsAt:add(today,31)})]);
 state=await api('/api/sctr');assert.equal(state.status,'ACTIVE');assert.equal(await db.sctrPolicy.count(),1);
 await api('/api/sctr',body,'PATCH',403,cookie,{Origin:'https://untrusted.example'});
 const audit=await db.auditLog.findFirstOrThrow({where:{entity:'SCTR',actorId:user.id},orderBy:{createdAt:'desc'}});assert.equal(audit.action,'UPDATE');assert.equal(audit.recordId,'shared');assert.ok(audit.before.sctrEndsAt);assert.ok(audit.after.sctrEndsAt);
 const logs=await api('/api/history');assert.ok(logs.rows.some(log=>log.entity==='SCTR'));
 await mkdir('work',{recursive:true});await writeFile('work/sctr-test-fixtures.json',JSON.stringify({user:{id:user.id,username:user.username},supervisorId:supervisor.id,instructorId:one.id,secondInstructorId:off.id,tag,today}));
 console.log(`PASS: ${checks} API requests: shared persistence, automatic membership, 7-day reminder, inclusive expiry, renewal, one policy under concurrent writes, validation, CSRF, permissions, legacy endpoint rejection and audit history. Local fixtures retained for browser verification.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$disconnect());
