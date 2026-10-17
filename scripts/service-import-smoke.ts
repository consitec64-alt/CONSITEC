import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
const database=process.env.TEST_DATABASE_URL,base=process.env.TEST_BASE_URL,secret=process.env.AUTH_SECRET;
assert(database&&base&&secret&&['localhost','127.0.0.1'].includes(new URL(database).hostname)&&['localhost','127.0.0.1'].includes(new URL(base).hostname),'Use isolated local TEST_DATABASE_URL, TEST_BASE_URL and matching AUTH_SECRET');
const db=new PrismaClient({datasources:{db:{url:database}}});
async function main(){
 const tag='excel-test-'+Date.now(),rep=await db.salesperson.create({data:{name:tag+' comercial'}});
 const users:Record<string,any>={};for(const [key,role,repId] of [['admin','ADMIN',null],['sales','SALES',rep.id],['unassigned','SALES',null],['supervisor','SUPERVISOR',null]] as const)users[key]=await db.user.create({data:{username:tag+' '+key,role,salespersonId:repId,password:'unused-local-test',tutorialCompleted:true}});
 const courses=await Promise.all([1,2].map(i=>db.course.create({data:{name:tag+' course '+i}}))),instructors=await Promise.all([1,2,3].map(i=>db.instructor.create({data:{name:tag+' instructor '+i}})));
 const cookies:Record<string,string>={};for(const [key,user]of Object.entries(users))cookies[key]='consitec_session='+await new SignJWT({username:user.username,role:user.role,sessionVersion:0}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuer('consitec').setAudience('consitec-panel').setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(secret));
 let checks=0;
 async function api(path:string,body?:unknown,method=body?'POST':'GET',status=200,auth=cookies.admin,headers:Record<string,string>={}){const r=await fetch(base+path,{method,headers:{...(auth?{cookie:auth}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);checks++;return data;}
 const hash=createHash('sha256').update(tag).digest('hex'),key=(row:number,year=2097)=>`excel:${hash}:0:${row}:${year}`;
 const body={importKey:key(2),importedLocation:'Lugar escrito en el Excel',company:tag,courseIds:courses.map(c=>c.id),instructorIds:[instructors[0].id],modality:'IN_PERSON',salespersonId:rep.id,sessions:[{date:'2097-07-01',startTime:'',endTime:'',modality:'IN_PERSON',reportedInstructionalMinutes:480}]};
 await api('/api/services/import',body,'POST',401,'');await api('/api/services/import',body,'POST',403,cookies.supervisor);await api('/api/services/import',body,'POST',409,cookies.unassigned);
 const first=(await api('/api/services/import',body)).service;assert.equal(first.amount,'0');assert.equal(first.dates[0].reportedInstructionalMinutes,480);assert.equal(first.dates[0].startTime,null);assert.equal(first.importedLocation,body.importedLocation);
 const repeated=await api('/api/services/import',{...body,amount:999});assert.equal(repeated.service.id,first.id);assert.equal(repeated.alreadyImported,true);assert.equal(repeated.service.amount,'0');assert.equal(await db.service.count({where:{importKey:body.importKey}}),1);
 const parallelBody={...body,importKey:key(3),company:tag+' concurrent',sessions:[{...body.sessions[0],date:'2097-07-02'}]};const parallel=await Promise.all([api('/api/services/import',parallelBody),api('/api/services/import',parallelBody)]);assert.equal(parallel[0].service.id,parallel[1].service.id);assert.equal(await db.service.count({where:{importKey:key(3)}}),1);
 for(const reported of [-1,0,1441,1.5,'480'])await api('/api/services/import',{...body,importKey:key(4),sessions:[{...body.sessions[0],reportedInstructionalMinutes:reported}]},'POST',400);
 await api('/api/services/import',{...body,importKey:'bad'},'POST',400);await api('/api/services/import',{...body,importKey:key(5,2096)},'POST',400);await api('/api/services/import',{...body,sessions:[...body.sessions,...body.sessions]},'POST',400);await api('/api/services/import',{...body,importedLocation:'x'.repeat(201)},'POST',400);
 await api('/api/services/import',{...body,importKey:key(6),company:tag+' occupied'},'POST',409);
 const duplicateBody={...body,importKey:key(7),instructorIds:[instructors[1].id]};const duplicate=await api('/api/services/import',duplicateBody,'POST',409);assert.equal(duplicate.code,'POSSIBLE_DUPLICATE');assert.ok((await api('/api/services/import',{...duplicateBody,allowDuplicate:true})).service.id);
 const register=(await api('/api/instructor-register?month=7&year=2097')).rows.find((r:any)=>r.serviceId===first.id);assert.equal(register.instructionalMinutes,480);assert.equal(register.location,body.importedLocation);
 await api(`/api/services/${first.id}`,{...body,allowDuplicate:true,amount:1200,status:'SCHEDULED'},'PATCH');let persisted=await db.service.findUniqueOrThrow({where:{id:first.id},include:{dates:true}});assert.equal(persisted.dates[0].reportedInstructionalMinutes,480);assert.equal(persisted.importedLocation,body.importedLocation);assert.equal(persisted.importKey,body.importKey);
 await api('/api/service-draft',{company:body.company,courseIds:body.courseIds,instructorIds:body.instructorIds,sessions:JSON.stringify(body.sessions)},'PUT');const draft=await api('/api/service-draft');assert.equal(JSON.parse(draft.draft.values.sessions)[0].reportedInstructionalMinutes,480);
 await api(`/api/services/${first.id}`,{...body,allowDuplicate:true,amount:1200,status:'SCHEDULED',sessions:[{...body.sessions[0],startTime:'09:00',endTime:'18:00'}]},'PATCH');persisted=await db.service.findUniqueOrThrow({where:{id:first.id},include:{dates:true}});assert.equal(persisted.dates[0].reportedInstructionalMinutes,null);
 await api(`/api/services/${first.id}`,undefined,'DELETE');const trash=await api('/api/services/import',body,'POST',409);assert.equal(trash.code,'IMPORT_IN_TRASH');await api('/api/trash',{entity:'SERVICE',id:first.id});assert.equal((await api('/api/services/import',body)).service.id,first.id);
 await db.monthlyClose.create({data:{id:'2097-08',closedAt:new Date(),closedBy:users.admin.id,closedByName:users.admin.username}});const closed=await api('/api/services/import',{...body,importKey:key(8),sessions:[{...body.sessions[0],date:'2097-08-01'}]},'POST',409);assert.equal(closed.code,'MONTH_CLOSED');
 const sales=(await api('/api/services/import',{...body,importKey:key(9),company:tag+' vendedor',salespersonId:'ignored-client-input',sessions:[{...body.sessions[0],date:'2097-09-01'}]},'POST',200,cookies.sales)).service;assert.equal(sales.salespersonId,rep.id);
 await api('/api/services/import',body,'POST',403,cookies.admin,{Origin:'https://untrusted.example'});
 const legacy=await db.serviceDay.findUnique({where:{id:'excel-legacy-day'}});if(legacy)assert.equal(legacy.reportedInstructionalMinutes,null);
 await mkdir('work',{recursive:true});await writeFile('work/excel-import-fixtures.json',JSON.stringify({tag,rep,users,courses,instructors,firstId:first.id}));
 console.log(`PASS: ${checks} API requests against isolated PostgreSQL: reported hours/place, zero amount, repeat/concurrent idempotency, validity, duplicates/conflicts, editing, drafts, trash/restore, closed month, salesperson, permissions and CSRF.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
