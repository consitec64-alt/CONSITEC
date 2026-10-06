import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcrypt';
const database=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1'].includes(database.hostname)&&database.pathname==='/consitec','Use isolated local DB');
const db=new PrismaClient(),tag='sessions-'+randomUUID(),password=randomUUID();
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3000';
const users=[],reps=[],courses=[],instructors=[];let checks=0;
async function api(path,cookie,method='GET',body){checks++;return fetch(new URL(path,base),{redirect:'manual',method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function result(response,status=200){assert.equal(response.status,status,await response.clone().text());return response.json();}
async function login(user){const response=await api('/api/auth/login',null,'POST',{username:user.username,password});await result(response);return response.headers.get('set-cookie').split(';')[0];}
try{
 const admin=await db.user.create({data:{username:tag,password:await bcrypt.hash(password,12),role:'ADMIN'}});users.push(admin.id);const adminCookie=await login(admin);
 for(let n=0;n<2;n++){reps.push(await db.salesperson.create({data:{name:tag+' rep '+n}}));courses.push(await db.course.create({data:{name:tag+' course '+n}}));}
 const user=await result(await api('/api/users',adminCookie,'POST',{email:tag+'@example.test',password,role:'SALES',salespersonId:reps[0].id}),201);users.push(user.id);const cookie=await login(user);
 assert.equal(user.salesperson.id,reps[0].id);assert(!('password'in user));
 assert.equal((await result(await api('/api/auth/me',cookie))).salespersonId,reps[0].id);
 await result(await api('/api/users',adminCookie,'POST',{email:tag+'-bad@example.test',password,role:'SALES',salespersonId:'missing'}),400);
 for(const [path,method,body] of [['/api/metadata/salespeople','GET'],['/api/metadata/salespeople','POST',{name:tag+' forbidden'}],[`/api/metadata/salespeople/${reps[0].id}`,'PATCH',{color:'#abcdef'}],[`/api/metadata/salespeople/${reps[0].id}`,'DELETE']])await result(await api(path,cookie,method,body),403);
 await result(await api('/api/users',cookie,'PATCH',{id:user.id,salespersonId:reps[1].id}),403);
 const instructor=await result(await api('/api/metadata/instructors',adminCookie,'POST',{name:tag,courseIds: courses.map(c=>c.id)}),201);instructors.push(instructor.id);assert.deepEqual(instructor.courses.map(c=>c.id).sort(),courses.map(c=>c.id).sort());
 await result(await api(`/api/metadata/instructors/${instructor.id}`,adminCookie,'PATCH',{name:tag,courseIds:[courses[1].id]}));assert.deepEqual((await db.instructor.findUnique({where:{id:instructor.id},include:{courses:true}})).courses.map(c=>c.id),[courses[1].id]);
 await result(await api(`/api/metadata/instructors/${instructor.id}`,adminCookie,'PATCH',{name:tag,courseIds:[42]}),400);
 const q='/api/dashboard?month=11&year=2096',before=await result(await api(q,cookie));
 const body={company:tag,correlativeCode:'1234',courseId:courses[0].id,salespersonId:reps[1].id,amount:'201.25',certificatesOnly:false,status:'INVOICED',invoiceDate:'2096-11-28',modality:'VIRTUAL',sessions:[{date:'2096-10-31',startTime:'09:00',endTime:'14:00'},{date:'2096-11-01',startTime:'09:00',endTime:'15:00'},{date:'2096-11-08',startTime:'08:30',endTime:'13:31'}]};
 await result(await api('/api/services',adminCookie,'POST',body),409); // Unassigned administrator may not invent ownership.
 for(const sessions of [[{date:'2096-11-01',startTime:'24:00',endTime:'25:00'}],[{date:'2096-11-01',startTime:'15:00',endTime:'09:00'}],[{date:'2096-11-01',startTime:'09:00'}],[{date:'2096-11-01'},{date:'2096-11-01'}]])await result(await api('/api/services',cookie,'POST',{...body,sessions}),400);
 await result(await api('/api/services',cookie,'POST',{...body,modality:'INVALID'}),400);
 const service=await result(await api('/api/services',cookie,'POST',body),201);assert.equal(service.salesperson.id,reps[0].id,'Ignore client-supplied owner');assert.equal(service.dates.length,3);assert.equal(service.dates[1].startTime,'09:00');assert.equal(service.dates[1].endTime,'15:00');assert.equal(service.modality,'VIRTUAL');
 const after=await result(await api(q,cookie));assert.equal(after.totalServices,before.totalServices+2);assert.equal(after.totalInvoicedBilling,before.totalInvoicedBilling+201.25);assert.equal(after.totalEstimatedBilling,before.totalEstimatedBilling);assert.equal(after.bySalesperson[reps[0].name],2);assert.equal(after.weeklyMatrix[reps[0].name]['Week 1'],1);assert.equal(after.weeklyMatrix[reps[0].name]['Week 2'],1);assert(after.reportSalespeople.some(r=>r.id===reps[0].id));
 await result(await api('/api/users',adminCookie,'PATCH',{id:user.id,salespersonId:reps[1].id})); // Already issued session must see new assignment.
 const edited=await result(await api(`/api/services/${service.id}`,cookie,'PATCH',{...body,modality:'IN_PERSON'}));assert.equal(edited.salesperson.id,reps[0].id,'Editing retains original owner');assert.equal(edited.modality,'IN_PERSON');
 const saleBody={customerName:tag,customerType:'COMPANY',amount:800,saleDate:'2096-11-20',status:'INVOICED',invoiceDate:'2096-11-28',courseId:courses[0].id,salespersonId:reps[0].id,correlativeCode:'1235'};
 const sale=await result(await api('/api/certificate-sales',cookie,'POST',saleBody),201);assert.equal(sale.salespersonId,reps[1].id);const copy=await db.service.findFirstOrThrow({where:{company:tag,certificatesOnly:true}});assert.equal(copy.salespersonId,reps[1].id);
 const final=await result(await api(q,cookie));assert.equal(final.totalInvoicedBilling,before.totalInvoicedBilling+1001.25,'Company certificate agenda copy never doubles invoice');
 await result(await api('/api/users',adminCookie,'PATCH',{id:user.id,salespersonId:reps[0].id}));const saleEdit=await result(await api(`/api/certificate-sales/${sale.id}`,cookie,'PATCH',saleBody));assert.equal(saleEdit.salesperson.id,reps[1].id);
 await db.course.delete({where:{id:courses[1].id}});assert.equal((await db.instructor.findUnique({where:{id:instructor.id},include:{courses:true}})).courses.length,0,'Catalog deletion removes links');
 console.log(`Assignment/session smoke passed: ${checks} requests; admin catalog authorization, assigned ownership, session freshness, edit ownership preservation, course relations, 24-hour schedules, per-date monthly/weekly counts and single invoice.`);
}finally{
 await db.service.deleteMany({where:{salespersonId:{in:reps.map(r=>r.id)}}});await db.certificateSale.deleteMany({where:{salespersonId:{in:reps.map(r=>r.id)}}});await db.user.deleteMany({where:{id:{in:users}}});await db.instructor.deleteMany({where:{id:{in:instructors}}});await db.course.deleteMany({where:{id:{in:courses.map(c=>c.id)}}});await db.salesperson.deleteMany({where:{id:{in:reps.map(r=>r.id)}}});await db.$disconnect();
}
