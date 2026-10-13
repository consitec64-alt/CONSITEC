import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const db=new PrismaClient(),tag='optional-'+randomUUID(),password=randomUUID(),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3027';
assert(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)&&new URL(process.env.DATABASE_URL).pathname==='/consitec');assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
let user,rep,course,cookie,quote;const ids=[];
async function api(path,body,status=201,method='POST'){const r=await fetch(base+path,{method,headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,status,await r.clone().text());return r.json();}
try{
 rep=await db.salesperson.create({data:{name:tag}});course=await db.course.create({data:{name:tag}});user=await db.user.create({data:{username:tag,password:await bcrypt.hash(password,10),role:'SALES',salespersonId:rep.id,tutorialCompleted:true}});
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:tag,password})});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 const date='2098-06-15',body={company:tag,courseIds:[course.id],amount:100,status:'SCHEDULED',modality:'VIRTUAL',certificatesOnly:false,sessions:[{date,startTime:'',endTime:''}]};
 for(const [index,code] of [undefined,null,''].entries()){
  const row=await api('/api/services',{...body,company:tag+index,correlativeCode:code});ids.push(row.id);assert.equal(row.correlativeCode,null);assert.equal(row.dates[0].startTime,null);assert.equal(row.dates[0].endTime,null);
 }
 for(const code of ['123','AB12','12345',42])await api('/api/services',{...body,correlativeCode:code},400);
 for(const hours of [{startTime:'09:00',endTime:''},{startTime:'',endTime:'12:00'},{startTime:'13:00',endTime:'09:00'},{startTime:'25:00',endTime:'26:00'}])await api('/api/services',{...body,sessions:[{date,...hours}]},400);
 const complete=await api('/api/services',{...body,company:tag+'complete',correlativeCode:'0042',sessions:[{date,startTime:'09:00',endTime:'12:00'}]});ids.push(complete.id);assert.equal(complete.correlativeCode,'0042');
 const cleared=await api('/api/services/'+complete.id,{...body,company:tag+'complete',correlativeCode:''},200,'PATCH');assert.equal(cleared.correlativeCode,null);assert.equal(cleared.dates[0].startTime,null);assert.equal(cleared.dates[0].endTime,null);
 await api('/api/certificate-sales',{customerName:tag,customerType:'COMPANY',amount:100,status:'SCHEDULED',saleDate:date,courseIds:[course.id]},400);
 quote=await api('/api/quotations',{company:tag+'quote',courseIds:[course.id],amount:100,status:'ACCEPTED',modality:'VIRTUAL',tentativeDates:[date]});
 const converted=await api(`/api/quotations/${quote.id}/convert`,{sessions:[{date,startTime:'',endTime:''}]},200);ids.push(converted.id);assert.equal(converted.correlativeCode,null);assert.equal(converted.dates[0].startTime,null);
 console.log('PASS optional service fields: omitted/null/empty codes, blank schedules, invalid supplied values, partial/reversed times, valid values and clearing on edit. Certificate company rule retained.');
}finally{await db.service.deleteMany({where:{id:{in:ids}}});if(quote)await db.quotation.delete({where:{id:quote.id}});if(user){await db.auditLog.deleteMany({where:{actorId:user.id}});await db.user.delete({where:{id:user.id}});}if(course)await db.course.delete({where:{id:course.id}});if(rep)await db.salesperson.delete({where:{id:rep.id}});await db.$disconnect();}
