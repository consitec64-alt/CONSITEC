import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {parseEnv} from 'node:util';import {PrismaClient} from '@prisma/client';import bcrypt from 'bcrypt';import {randomUUID} from 'node:crypto';
const vars=parseEnv(readFileSync('.env','utf8'));assert(['localhost','127.0.0.1'].includes(new URL(vars.DATABASE_URL).hostname));assert.equal(new URL(vars.DATABASE_URL).pathname,'/consitec');
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3043';assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const db=new PrismaClient({datasources:{db:{url:vars.DATABASE_URL}}}),tag='closing-'+randomUUID(),keys=['2001-01','2001-02','2001-03'],ids=[];let course,rep,requests=0;
assert.equal(await db.monthlyClose.count({where:{id:{in:keys}}}),0,'Reserved fixture months must not already be closed');
async function call(path,method='GET',body,cookie){requests++;const r=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
try{
 course=await db.course.create({data:{name:tag}});rep=await db.salesperson.create({data:{name:tag}});const password=randomUUID()+randomUUID();let admin,sales;
 for(const role of ['ADMIN','SALES']){const user=await db.user.create({data:{username:tag+role,password:await bcrypt.hash(password,10),role,salespersonId:rep.id,tutorialCompleted:true}});ids.push(user.id);const login=await call('/api/auth/login','POST',{username:user.username,password});assert.equal(login.status,200);if(role==='ADMIN')admin=login.cookie;else sales=login.cookie;}
 const path='/api/monthly-close',change=(month,action='CLOSE',cookie=admin)=>call(path,'POST',{year:2001,month,action},cookie);
 assert.equal((await call(path+'?year=2001&month=1')).status,401);
 assert.equal((await change(1,'CLOSE',sales)).status,403);assert.equal((await change(1,'REOPEN',sales)).status,403);
 assert.equal((await call(path+'?year=2001&month=0','GET',null,admin)).status,400);
 assert.equal((await call(path,'POST',{year:2099,month:1,action:'CLOSE'},admin)).status,400);
 const service={certificatesOnly:false,company:tag,courseIds:[course.id],correlativeCode:'0123',amount:100,status:'INVOICED',invoiceDate:'2001-03-01',sessions:[{date:'2001-01-10',startTime:'09:00',endTime:'15:00'},{date:'2001-02-10',startTime:'09:00',endTime:'13:00'}],modality:'VIRTUAL'};
 const sale={customerName:tag,customerType:'COMPANY',courseId:course.id,amount:800,saleDate:'2001-02-10',status:'INVOICED',invoiceDate:'2001-03-01',correlativeCode:'0124'};
 const s=await call('/api/services','POST',service,sales);assert.equal(s.status,201);const sid=s.data.id;
 const cert=await call('/api/certificate-sales','POST',sale,sales);assert.equal(cert.status,201);const cid=cert.data.id;
 const restore=await call('/api/certificate-sales','POST',{...sale,customerName:tag+'restore',amount:150},sales);assert.equal(restore.status,201);
 assert.equal((await call('/api/certificate-sales/'+restore.data.id,'DELETE',null,sales)).status,200);
 const serviceRestore=await call('/api/services','POST',{...service,company:tag+'restore',amount:150},sales);assert.equal(serviceRestore.status,201);assert.equal((await call('/api/services/'+serviceRestore.data.id,'DELETE',null,sales)).status,200);
 const open=await call(path+'?year=2001&month=3','GET',null,admin);assert(open.data.pending.includes('2001-03'));assert.equal(open.data.closedAt,null);
 const baseline=(await call('/api/dashboard?year=2001&month=3','GET',null,admin)).data.totalInvoicedBilling;
 assert.equal((await change(3)).status,200);assert.equal((await change(3)).status,409);
 const closed=await call(path+'?year=2001&month=3','GET',null,sales);assert(closed.data.closedAt);assert.equal(closed.data.closedByName,tag+'ADMIN');assert.deepEqual(closed.data.pending,[]);
 const blocked=async result=>{assert.equal(result.status,409);assert.equal(result.data.code,'MONTH_CLOSED');};
 await blocked(await call('/api/services/'+sid,'PATCH',{...service,invoiceDate:'2001-02-01'},sales));
 await blocked(await call('/api/services/'+sid,'DELETE',null,admin));
 await blocked(await call('/api/certificate-sales/'+cid,'PATCH',{...sale,invoiceDate:'2001-02-01'},admin));
 await blocked(await call('/api/certificate-sales/'+cid,'DELETE',null,sales));
 await blocked(await call('/api/trash','POST',{entity:'CERTIFICATE',id:restore.data.id},admin));
 await blocked(await call('/api/trash','POST',{entity:'SERVICE',id:serviceRestore.data.id},sales));
 await blocked(await call('/api/services','POST',{...service,company:tag+'new'},admin));
 await blocked(await call('/api/certificate-sales','POST',{...sale,customerName:tag+'new'},sales));
 assert.equal((await call('/api/dashboard?year=2001&month=3','GET',null,sales)).data.totalInvoicedBilling,baseline);
 assert.equal((await db.service.findUnique({where:{id:sid}})).deletedAt,null);
 assert.equal((await change(3,'REOPEN')).status,200);
 assert.equal((await call('/api/certificate-sales/'+cid,'PATCH',{...sale,amount:810},sales)).status,200);
 assert.equal((await change(1)).status,200);
 await blocked(await call('/api/services/'+sid,'PATCH',{...service,sessions:[{date:'2001-02-10',startTime:'09:00',endTime:'13:00'}]},admin));
 await blocked(await call('/api/services','POST',{...service,company:tag+'multi'},sales));
 assert.equal((await change(1,'REOPEN')).status,200);
 assert.equal((await call('/api/services/'+sid,'PATCH',{...service,amount:120,allowDuplicate:true},sales)).status,200);
 const race=await Promise.all([change(2),call('/api/services','POST',{...service,company:tag+'race'},sales)]);assert.equal(race[0].status,200);assert([201,409].includes(race[1].status));if(race[1].status===409)assert.equal(race[1].data.code,'MONTH_CLOSED');
 const logs=await db.auditLog.findMany({where:{actorId:ids[0],entity:'MONTH'}});assert.equal(logs.filter(l=>l.action==='CLOSE').length,3);assert.equal(logs.filter(l=>l.action==='REOPEN').length,2);assert(logs.every(l=>l.actorName===tag+'ADMIN'));
 assert.equal((await change(2,'REOPEN')).status,200);
 assert.equal((await call('/api/trash','POST',{entity:'SERVICE',id:serviceRestore.data.id},sales)).status,200);
 console.log(`PASS: monthly closure (${requests} requests): admin authorization, future-month rejection, invoice and multi-date locks, create/edit/delete/restore, report preservation, concurrent close/write and audited reopen.`);
}finally{
 await db.service.deleteMany({where:{salespersonId:rep?.id??'__none__'}});await db.certificateSale.deleteMany({where:{salespersonId:rep?.id??'__none__'}});await db.auditLog.deleteMany({where:{actorId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});await db.monthlyClose.deleteMany({where:{id:{in:keys}}});if(course)await db.course.delete({where:{id:course.id}});if(rep)await db.salesperson.delete({where:{id:rep.id}});await db.$disconnect();
}
