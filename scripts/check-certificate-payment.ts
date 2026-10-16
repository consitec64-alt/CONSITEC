import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { saleInput, serviceInput, InvalidRecord } from '../lib/record-input';
import { PAYMENT_WITHOUT_INVOICE, certificateStatusOptions, countsForCertificateRevenue } from '../lib/certificate-status';
import { invoiceDateFor } from '../lib/invoice-date';
import { syncCertificateAgenda } from '../lib/certificate-agenda';
import { prisma } from '../lib/prisma';
import { GET } from '../app/api/dashboard/route';

async function main() {
  const day = new Date('2098-10-19T09:00:00Z');
  const certificate = {customerName:'Cliente',courseIds:['course'],saleDate:'2098-10-19',amount:'800.25',status:PAYMENT_WITHOUT_INVOICE};
  for (const customerType of ['COMPANY','NATURAL_PERSON']) {
    const data = saleInput({...certificate,customerType});
    assert.equal(data.status,PAYMENT_WITHOUT_INVOICE);
    assert.equal(data.amount.toString(),'800.25');
    assert.equal(certificateStatusOptions(customerType)[PAYMENT_WITHOUT_INVOICE],'Pago sin factura');
    assert.equal(invoiceDateFor(data.status,day,{status:'INVOICED',invoicedAt:day}),null);
  }
  assert.throws(()=>saleInput({...certificate,customerType:'NATURAL_PERSON',status:'INVOICED'}),InvalidRecord);
  assert.throws(()=>saleInput({...certificate,customerType:'COMPANY',status:'PAID'}),InvalidRecord);
  for (const certificatesOnly of [true,false]) assert.throws(()=>serviceInput({company:'Empresa',courseIds:['course'],instructorIds:['instructor'],serviceDate:'2098-10-19',status:PAYMENT_WITHOUT_INVOICE,certificatesOnly}),InvalidRecord);
  const revenue = [{status:'PAID',amount:100},{status:'INVOICED',amount:200},{status:PAYMENT_WITHOUT_INVOICE,amount:800.25}];
  assert.equal(revenue.filter(countsForCertificateRevenue).reduce((sum,s)=>sum+s.amount,0),300);

  // Agenda copies retain the original amount and service states, never the new certificate state.
  const actor={id:'actor',username:'admin',role:'ADMIN',salespersonId:null};
  let before: any = null, saved: any;
  const tx = {
    $queryRaw: async()=>[], monthlyClose:{findFirst:async()=>null},
    auditLog:{create:async()=>({})},
    service:{findUnique:async()=>before,create:async({data}:any)=>{saved={id:'copy',...data,dates:[{date:data.serviceDate}],instructors:[],instructorId:null};return saved;},update:async({data}:any)=>{saved={...before,...data,dates:data.dates?[{date:data.serviceDate}]:before.dates};return saved;}}
  } as any;
  const sale={id:'certificate',customerName:'Cliente',customerType:'COMPANY',amount:new Prisma.Decimal('800.25'),saleDate:day,status:PAYMENT_WITHOUT_INVOICE,invoicedAt:null,correlativeCode:null,courseId:'course',salespersonId:null,deletedAt:null};
  await syncCertificateAgenda(tx,sale,['course'],actor);
  assert.equal(saved.status,'SCHEDULED');assert.equal(saved.amount.toString(),'800.25');
  before={...saved,dates:[{date:day}],instructors:[],instructorId:null};
  await syncCertificateAgenda(tx,{...sale,status:'INVOICED',invoicedAt:day},['course'],actor);
  assert.equal(saved.status,'INVOICED');assert.equal(saved.invoicedAt,day);
  before=saved;
  await syncCertificateAgenda(tx,sale,['course'],actor);
  assert.equal(saved.status,'SCHEDULED');assert.equal(saved.invoicedAt,null);assert.equal(saved.amount.toString(),'800.25');
  await syncCertificateAgenda(tx,{...sale,deletedAt:day},['course'],actor);assert.ok(saved.deletedAt);
  before=saved;
  await syncCertificateAgenda(tx,sale,['course'],actor);assert.equal(saved.deletedAt,null);assert.equal(saved.amount.toString(),'800.25');

  // Exercise the actual dashboard handler with mocked delegates; no database access.
  const originals={services:prisma.service.findMany,execute:prisma.service.updateMany,certificates:prisma.certificateSale.findMany,plan:prisma.commercialWeekPlan.findUnique,reps:prisma.salesperson.findMany};
  const base={serviceDate:day,dates:[{date:day}],salesperson:{name:'Comercial'},course:{name:'Curso'},courses:[],instructor:null,instructors:[],location:null,certificatesOnly:false,status:'SCHEDULED'};
  const service=(id:string,amount:number,certificateSale:any=null)=>({...base,id,amount:new Prisma.Decimal(amount),company:id,certificateSale});
  try {
    (prisma.service as any).updateMany=async()=>({count:0});
    (prisma.commercialWeekPlan as any).findUnique=async()=>null;
    (prisma.salesperson as any).findMany=async()=>[];
    (prisma.service as any).findMany=async(query:any)=>{
      assert.equal(query.where.deletedAt,null);
      if(query.where.status){assert.equal(query.where.status,'INVOICED');assert.equal(query.where.certificatesOnly,false);return [service('invoice',50)];}
      assert.equal(query.include.certificateSale.select.status,true);
      return [service('training',100),service('pending-copy',1000,{status:'SCHEDULED'}),service('no-invoice-copy',800.25,{status:PAYMENT_WITHOUT_INVOICE})];
    };
    (prisma.certificateSale as any).findMany=async(query:any)=>{
      assert.equal(query.where.deletedAt,null);
      if(query.where.status){assert.equal(query.where.status,'INVOICED');assert.equal(query.where.customerType,'COMPANY');assert.equal(query.where.amount.gt,700);return [{amount:new Prisma.Decimal(900),salesperson:{name:'Comercial'}}];}
      return [{customerName:'Visible sin factura',status:PAYMENT_WITHOUT_INVOICE}];
    };
    const response=await GET(new Request('http://localhost/api/dashboard?month=10&year=2098'));
    assert.equal(response.status,200);const data=await response.json();
    assert.equal(data.totalEstimatedBilling,1100);assert.equal(data.totalInvoicedBilling,950);
    assert.equal(data.invoicedBySalesperson.Comercial,950);
    assert.equal(data.totalServices,3,'Excluded monetary totals must not remove activity');
    assert.equal(data.totalCertificateSales,1,'The certificate remains visible');
  } finally {
    (prisma.service as any).findMany=originals.services;(prisma.service as any).updateMany=originals.execute;
    (prisma.certificateSale as any).findMany=originals.certificates;(prisma.commercialWeekPlan as any).findUnique=originals.plan;(prisma.salesperson as any).findMany=originals.reps;
  }
  console.log('PASS: certificate-only status, both customer types, revenue exclusion, invoice date clearing, agenda synchronization/transitions/trash/restore and dashboard monetary totals. No database writes.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
