import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcrypt';
const url=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/consitec','Local test database only');
const db=new PrismaClient(),tag='mixed-'+randomUUID(),password=randomUUID(),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3061';
let user,rep,course,location;let checks=0;
async function api(path,cookie,method='GET',body){checks++;return fetch(base+path,{redirect:'manual',method,headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function json(response,status=200){assert.equal(response.status,status,await response.clone().text());return response.json();}
try{
 rep=await db.salesperson.create({data:{name:tag}});course=await db.course.create({data:{name:tag}});location=await db.location.create({data:{department:tag,district:'Miraflores'}});
 user=await db.user.create({data:{username:tag,password:await bcrypt.hash(password,10),role:'SALES',salespersonId:rep.id,tutorialCompleted:true}});
 const login=await api('/api/auth/login',null,'POST',{username:user.username,password});await json(login);const cookie=login.headers.get('set-cookie').split(';')[0];
 const period='/api/dashboard?month=8&year=2094',before=await json(await api(period,cookie));
 const body={company:tag,courseIds:[course.id],amount:'2100.75',correlativeCode:'9961',status:'INVOICED',invoiceDate:'2094-08-15',modality:'MIXED',certificatesOnly:false,locationId:location.id,sessions:[{date:'2094-07-31',startTime:'09:00',endTime:'15:00',modality:'VIRTUAL'},{date:'2094-08-01',startTime:'08:00',endTime:'12:00',modality:'IN_PERSON'},{date:'2094-08-02',startTime:'09:00',endTime:'14:00',modality:'VIRTUAL'}]};
 for(const invalid of [undefined,null,'','MIXED','BAD',42])await json(await api('/api/services',cookie,'POST',{...body,sessions:body.sessions.map((s,i)=>i===1?{...s,modality:invalid}:s)}),400);
 await json(await api('/api/services',cookie,'POST',{...body,sessions:undefined,serviceDates:body.sessions.map(s=>s.date)}),400);
 const service=await json(await api('/api/services',cookie,'POST',body),201);assert.equal(service.modality,'MIXED');assert.equal(service.amount,'2100.75');assert.deepEqual(service.dates.map(d=>d.modality),['VIRTUAL','IN_PERSON','VIRTUAL']);
 const after=await json(await api(period,cookie));assert.equal(after.totalServices,before.totalServices+2);assert.equal(after.totalInvoicedBilling,before.totalInvoicedBilling+2100.75);
 const register=`/api/instructor-register?month=8&year=2094&company=${tag}`;
 const rows=(await json(await api(register,cookie))).rows;assert.deepEqual(rows.map(r=>r.modality),['Presencial','Virtual']);assert.deepEqual(rows.map(r=>r.location),[`${tag} / Miraflores`,'Virtual']);assert.deepEqual(rows.map(r=>r.instructionalMinutes),[240,300]);
 assert.equal((await json(await api(register+'&modality=VIRTUAL',cookie))).rows.length,1);assert.equal((await json(await api(register+'&modality=IN_PERSON',cookie))).rows.length,1);assert.equal((await json(await api(register+'&modality=MIXED',cookie))).rows.length,2);
 const june=(await json(await api(`/api/instructor-register?month=7&year=2094&company=${tag}&modality=VIRTUAL`,cookie))).rows;assert.equal(june.length,1);assert.equal(june[0].instructionalMinutes,300);
 await json(await api(`/api/services/${service.id}`,cookie,'PATCH',{...body,sessions:body.sessions.map((s,i)=>i===2?{...s,modality:null}:s)}),400);assert.equal((await db.service.findUnique({where:{id:service.id},include:{dates:true}})).dates.length,3);
 const switched=await json(await api(`/api/services/${service.id}`,cookie,'PATCH',{...body,modality:'IN_PERSON'}));assert(switched.dates.every(d=>d.modality==='IN_PERSON'),'Uniform modality overrides previous per-date choices');assert.equal((await json(await api(register+'&modality=VIRTUAL',cookie))).rows.length,0);
 await json(await api(`/api/services/${service.id}`,cookie,'PATCH',body));await json(await api(`/api/services/${service.id}`,cookie,'DELETE'));await json(await api('/api/trash',cookie,'POST',{entity:'SERVICE',id:service.id}));assert.deepEqual((await db.service.findUnique({where:{id:service.id},include:{dates:{orderBy:{date:'asc'}}}})).dates.map(d=>d.modality),['VIRTUAL','IN_PERSON','VIRTUAL']);
 // Mixed quotations keep their parent modality but require date modes when converted.
 const quote=(await json(await api('/api/quotations',cookie,'POST',{company:tag+' quote',amount:'1500',courseIds:[course.id],status:'ACCEPTED',modality:'MIXED',tentativeDates:['2094-09-01','2094-09-02']}),201));
 const conversion={correlativeCode:'9962',sessions:[{date:'2094-09-01',startTime:'09:00',endTime:'15:00',modality:'VIRTUAL'},{date:'2094-09-02',startTime:'08:00',endTime:'12:00',modality:'IN_PERSON'}]};
 await json(await api(`/api/quotations/${quote.id}/convert`,cookie,'POST',{...conversion,sessions:conversion.sessions.map(s=>({...s,modality:null}))}),400);
 const saved=await json(await api(`/api/quotations/${quote.id}/convert`,cookie,'POST',conversion));assert.equal(saved.modality,'MIXED');assert.equal(saved.amount,'1500');assert.deepEqual(saved.dates.map(d=>d.modality),['VIRTUAL','IN_PERSON']);
 // Legacy records without date modality still use the parent's Virtual/Presencial choice.
 await db.service.create({data:{company:tag+' legacy',courseId:course.id,salespersonId:rep.id,amount:1,modality:'VIRTUAL',serviceDate:new Date('2094-08-03T09:00:00Z'),dates:{create:{date:new Date('2094-08-03T09:00:00Z')}}}});
 const legacy=(await json(await api(`/api/instructor-register?month=8&year=2094&company=${tag} legacy&modality=VIRTUAL`,cookie))).rows;assert.equal(legacy[0].modality,'Virtual');assert.equal(legacy[0].location,'Virtual');
 const day=await db.serviceDay.findFirst({where:{serviceId:service.id}});await assert.rejects(db.serviceDay.update({where:{id:day.id},data:{modality:'MIXED'}}),/constraint|23514/i);
 assert((await db.auditLog.findMany({where:{entity:'SERVICE',recordId:service.id}})).some(log=>log.after?.dates?.some(d=>d.modality==='IN_PERSON')));
 console.log(`Mixed modality smoke passed: ${checks} requests; per-date validation/persistence/filters, single invoice, cross-month dates, uniform normalization, restore, mixed quotation conversion, legacy fallback and database constraint.`);
}finally{
 if(rep){await db.quotation.deleteMany({where:{salespersonId:rep.id}});await db.service.deleteMany({where:{salespersonId:rep.id}});}
 if(user){await db.auditLog.deleteMany({where:{actorId:user.id}});await db.user.delete({where:{id:user.id}});}
 if(location)await db.location.delete({where:{id:location.id}});if(course)await db.course.delete({where:{id:course.id}});if(rep)await db.salesperson.delete({where:{id:rep.id}});await db.$disconnect();
}
