import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { unzipSync, strFromU8 } from 'fflate';
import { registerWorkbook } from '../lib/register-excel';
import { draftSessions } from '../lib/service-draft';
import { writeFile } from 'node:fs/promises';

const database = process.env.TEST_DATABASE_URL, base = process.env.TEST_BASE_URL, secret = process.env.AUTH_SECRET;
if (!database || !base || !secret || !['localhost','127.0.0.1'].includes(new URL(database).hostname)) throw Error('Use TEST_DATABASE_URL (PostgreSQL local aislado), TEST_BASE_URL y AUTH_SECRET compartido con el servidor de prueba.');
const db = new PrismaClient({datasources:{db:{url:database}}});
async function main() {
 const tag=`date-test-${Date.now()}`;
 const rep=await db.salesperson.create({data:{name:tag}});
 const user=await db.user.create({data:{username:tag+'@example.test',password:'unused-in-local-fixture',role:'ADMIN',tutorialCompleted:true,salespersonId:rep.id}});
 const [c1,c2]=await Promise.all([1,2].map(n=>db.course.create({data:{name:tag+' curso '+n}})));
 const [i1,i2,i3,i4]=await Promise.all([1,2,3,4].map(n=>db.instructor.create({data:{name:tag+' instructor '+n}})));
 const token=await new SignJWT({username:user.username,role:'ADMIN',sessionVersion:0}).setProtectedHeader({alg:'HS256'}).setSubject(user.id).setIssuer('consitec').setAudience('consitec-panel').setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(secret));
 let checks=0;
 async function api(path:string,body?:unknown,method=body?'POST':'GET',status=200) {
  const r=await fetch(base+path,{method,headers:{cookie:`consitec_session=${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);checks++;return data;
 }
 const session=(date:string,courses:string[]=[],instructors:string[]=[])=>({date,startTime:'09:00',endTime:'12:00',modality:'IN_PERSON',courseIds:courses,instructorIds:instructors});
 const a='2098-10-19',b='2098-10-20';
 const body={company:tag,courseIds:[c1.id,c2.id],instructorIds:[i1.id,i2.id],sessions:[session(a,[c1.id],[i1.id]),session(b,[c2.id],[i2.id])],amount:1200,modality:'IN_PERSON',status:'SCHEDULED',salespersonId:rep.id};
 const before=await api('/api/dashboard?month=10&year=2098');
 const created=await api('/api/services',body,'POST',201);
 assert.deepEqual(created.dates.map((d:any)=>d.courseIds),[[c1.id],[c2.id]]);assert.deepEqual(created.dates.map((d:any)=>d.instructorIds),[[i1.id],[i2.id]]);
 const persisted=await db.service.findUniqueOrThrow({where:{id:created.id},include:{dates:true}});assert.equal(persisted.amount.toString(),'1200');assert.equal(persisted.dates.length,2);
 const after=await api('/api/dashboard?month=10&year=2098');assert.equal(after.totalEstimatedBilling,before.totalEstimatedBilling+1200,'A single amount, not per instructor or date');
 const register=()=>api('/api/instructor-register?month=10&year=2098');
 const rows=(await register()).rows.filter((r:any)=>r.serviceId===created.id);
 assert.deepEqual(rows.map((r:any)=>[r.date,r.instructorId,r.courses]),[[a,i1.id,[c1.name]],[b,i2.id,[c2.name]]]);
 const sheet=strFromU8(unzipSync(registerWorkbook(rows))['xl/worksheets/sheet1.xml']);assert.ok(sheet.includes(c1.name));assert.ok(sheet.includes(c2.name));assert.equal((sheet.match(/<row /g)||[]).length,3);
 const filtered=await api(`/api/instructor-register?month=10&year=2098&courseId=${c2.id}&instructorId=${i1.id}`);assert.equal(filtered.rows.filter((r:any)=>r.serviceId===created.id).length,0);
 const availability=await api(`/api/instructors/availability?date=${a}&startTime=09:00&endTime=12:00`);assert.ok(availability.conflicts[i1.id]);assert.equal(availability.conflicts[i2.id],undefined);
 const reversed=await api('/api/services',{...body,company:tag+' reciprocal',amount:500,sessions:[session(a,[c1.id],[i2.id]),session(b,[c2.id],[i1.id])]},'POST',201);assert.ok(reversed.id);
 await api('/api/services',{...body,company:tag+' conflict',instructorIds:[i1.id],sessions:[session(a,[c1.id],[i1.id])]},'POST',409);
 const distinct=await api('/api/services',{...body,instructorIds:[i3.id],sessions:[session(a,[c2.id],[i3.id]),session(b,[c1.id],[i3.id])]},'POST',201);assert.ok(distinct.id,'Different courses on each shared date are not duplicates');
 const duplicate=await api('/api/services',{...body,instructorIds:[i4.id],sessions:[session(a,[c1.id],[i4.id]),session(b,[c2.id],[i4.id])]},'POST',409);assert.equal(duplicate.code,'POSSIBLE_DUPLICATE');
 await api('/api/services',{...body,sessions:[session(a,['not-in-service'],[i1.id])]},'POST',400);
 await api('/api/services',{...body,sessions:[session(a,[c1.id],['not-in-service'])]},'POST',400);
 const confirm={serviceId:created.id,date:a,instructorId:i1.id,confirmed:true};
 await api('/api/instructor-register',{...confirm,date:b},'PATCH',400);
 await api('/api/instructor-register',confirm,'PATCH');assert.equal((await register()).rows.find((r:any)=>r.id===rows[0].id).confirmed,true);
 await api(`/api/services/${created.id}`,{...body,allowDuplicate:true,sessions:[session(a,[c2.id],[i1.id]),session(b,[c2.id],[i2.id])]},'PATCH');assert.equal((await register()).rows.find((r:any)=>r.id===rows[0].id).confirmed,false,'Changed course assignment must invalidate the old confirmation');
 const inherited=await api('/api/services',{...body,company:tag+' inherited',sessions:[session('2098-10-25'),session('2098-10-26')],amount:1500},'POST',201);
 const inheritedRows=(await register()).rows.filter((r:any)=>r.serviceId===inherited.id);assert.equal(inheritedRows.length,4);assert.ok(inheritedRows.every((r:any)=>r.courses.length===2));
 const values={company:body.company,courseIds:body.courseIds,instructorIds:body.instructorIds,sessions:JSON.stringify(body.sessions),modality:'IN_PERSON'};
 await api('/api/service-draft',values,'PUT');const draft=await api('/api/service-draft');assert.deepEqual(draftSessions(draft.draft.values.sessions)?.map(day=>day.instructorIds),[[i1.id],[i2.id]]);
 await api(`/api/services/${created.id}`,undefined,'DELETE');await api('/api/trash',{entity:'SERVICE',id:created.id});assert.equal((await register()).rows.filter((r:any)=>r.serviceId===created.id).length,2);
 const saved=await db.service.findUniqueOrThrow({where:{id:created.id},include:{dates:true}});assert.deepEqual(saved.dates.map(d=>d.instructorIds),[[i1.id],[i2.id]]);
 const quote=await db.quotation.create({data:{company:tag+' quotation',amount:900,status:'ACCEPTED',salespersonId:rep.id,modality:'IN_PERSON',courses:{connect:[{id:c1.id},{id:c2.id}]}}});
 const converted=await api(`/api/quotations/${quote.id}/convert`,{instructorIds:[i1.id,i2.id],sessions:[session('2098-11-01',[c1.id],[i1.id]),session('2098-11-02',[c2.id],[i2.id])]});assert.deepEqual(converted.dates.map((d:any)=>d.courseIds),[[c1.id],[c2.id]]);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const tomorrow=new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 const daily=await api('/api/services',{...body,company:tag+' today',sessions:[session(today,[c1.id],[i1.id]),session(tomorrow,[c2.id],[i2.id])]},'POST',201);
 const reminder=await api('/api/daily-classes',{});const todayRow=reminder.reminder.classes.find((row:any)=>row.id===daily.id);assert.deepEqual(todayRow.courses,[c1.name]);assert.deepEqual(todayRow.instructors,[i1.name]);
 const legacy=await db.serviceDay.findUnique({where:{id:'legacy-day'}});if(legacy){assert.deepEqual(legacy.courseIds,[]);assert.deepEqual(legacy.instructorIds,[]);}
 await writeFile('work/date-test-fixtures.json',JSON.stringify({user:{id:user.id,username:user.username},rep,courses:[c1,c2],instructors:[i1,i2],createdId:created.id,company:tag}));
 console.log(`PASS: ${checks} real API requests against isolated PostgreSQL: persistence, per-day register/filters/XLSX, availability/reciprocal teams/conflicts, duplicate rules, validation, confirmations, inheritance, draft, trash/restore, quotation conversion and daily classes.`);
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
