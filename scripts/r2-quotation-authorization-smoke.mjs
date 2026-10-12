// Offline authorization check: run the application with dummy R2 variables, not a live account.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
const database=new URL(process.env.DATABASE_URL);assert(['localhost','127.0.0.1'].includes(database.hostname)&&database.pathname==='/consitec');
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3020';assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const db=new PrismaClient(),tag='r2-auth-'+randomUUID(),password=randomUUID(),users=[],reps=[];let course,quotation;
async function api(path,cookie,method='GET',body,status=200){const r=await fetch(base+path,{method,headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});assert.equal(r.status,status,await r.clone().text());return r;}
try {
 const hash=await bcrypt.hash(password,10);course=await db.course.create({data:{name:tag}});
 for(let i=0;i<2;i++){const rep=await db.salesperson.create({data:{name:tag+i}});reps.push(rep);users.push(await db.user.create({data:{username:tag+i,password:hash,role:'SALES',salespersonId:rep.id,tutorialCompleted:true}}));}
 const cookies=[];for(const u of users)cookies.push((await api('/api/auth/login',null,'POST',{username:u.username,password})).headers.get('set-cookie').split(';')[0]);
 quotation=await(await api('/api/quotations',cookies[0],'POST',{company:tag,courseIds:[course.id],amount:100,status:'DRAFT'} ,201)).json();
 const path=`/api/quotations/${quotation.id}/documents`,body={name:'test.pdf',size:14,contentType:'application/pdf'};
 await api(path,null,'POST',body,401);await api(path,cookies[1],'POST',body,404);
 for(const bad of [{...body,size:10485761},{...body,size:0},{...body,contentType:'text/plain'},{...body,name:'bad.exe'}])await api(path,cookies[0],'POST',bad,400);
 const doc=await(await api(path,cookies[0],'POST',body,201)).json();assert.equal(doc.provider,'R2');assert(doc.upload.url.startsWith('https://'));assert.equal(doc.upload.headers['If-None-Match'],'*');
 const persisted=await db.quotationDocument.findUniqueOrThrow({where:{id:doc.id}});assert.equal(persisted.storageProvider,'R2');assert.equal(persisted.state,'PENDING');
 await api(`/api/quotations/${quotation.id}/documents/${doc.id}`,cookies[0],'GET',undefined,404);
 await api(`/api/quotations/${quotation.id}/documents/${doc.id}`,cookies[1],'GET',undefined,404);
 await api('/api/quotations/upload',cookies[0],'POST',{type:'blob.generate-client-token',payload:{pathname:doc.pathname,clientPayload:JSON.stringify({documentId:doc.id}),multipart:false}},403);
 const rows=await(await api('/api/quotations',cookies[0])).json();assert(rows.storageEnabled);assert(!rows.rows.find(q=>q.id===quotation.id).documents.some(d=>d.pathname||d.upload));
 console.log('PASS R2 authorization/reservation: ownership, anonymous access, invalid files, signed upload metadata, provider persistence, unreadable pending files and rejection by the Blob token route. No live file upload performed.');
}finally{if(quotation)await db.quotation.delete({where:{id:quotation.id}});await db.auditLog.deleteMany({where:{actorId:{in:users.map(u=>u.id)}}});await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await db.salesperson.deleteMany({where:{id:{in:reps.map(r=>r.id)}}});if(course)await db.course.delete({where:{id:course.id}});await db.$disconnect();}
