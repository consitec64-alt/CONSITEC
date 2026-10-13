import assert from "node:assert/strict";
import { serviceInput, InvalidRecord, saleInput } from "../lib/record-input";
import { recordSalesperson } from "../lib/assigned-salesperson";
import { serviceDays } from "../lib/ui-types";
import { executePastServices, scheduledServiceStatus } from "../lib/service-status";
import { prisma } from "../lib/prisma";
import { limaToday } from "../lib/monthly-close";

async function main() {
  const minimal = {company:"Empresa", courseIds:["course"], instructorIds:["instructor"]};
  const record = serviceInput(minimal);
  assert.equal(record.serviceDate, null);
  assert.equal(record.amount.toString(), "0");
  assert.equal(record.status, "SCHEDULED");
  assert.deepEqual(record.sessions, []);
  for (const missing of ["company","courseIds","instructorIds"]) {
    const body: Record<string,unknown> = {...minimal}; delete body[missing];
    assert.throws(()=>serviceInput(body), InvalidRecord);
  }
  assert.deepEqual(serviceInput({...minimal, sessions:[{date:"",startTime:"",endTime:""}]}).dates, []);
  assert.throws(()=>serviceInput({...minimal, serviceDates:"invalid"}), InvalidRecord);
  assert.throws(()=>serviceInput({...minimal, sessions:[{date:"",startTime:"08:00"}]}), InvalidRecord);
  assert.throws(()=>serviceInput({...minimal, amount:-1}), InvalidRecord);
  assert.throws(()=>serviceInput({...minimal, sessions:[{date:"2026-02-30"}]}), InvalidRecord);
  const dated = serviceInput({...minimal, sessions:[{date:"2026-10-14"},{date:"2026-10-13"}], amount:"150.50"});
  assert.equal(dated.serviceDate?.toISOString().slice(0,10),"2026-10-13");
  assert.equal(dated.sessions.length,2);
  assert.deepEqual(serviceDays({serviceDate:null, dates:[]} as any),[]);
  assert.throws(()=>saleInput({customerType:"NATURAL_PERSON", customerName:"Cliente", courseIds:["course"], saleDate:"2026-10-13", amount:0, status:"SCHEDULED"}), InvalidRecord);
  const tx = {salesperson:{findUnique:async({where}:any)=>where.id==="rep"?{id:"rep"}:null},user:{findUnique:async()=>({salespersonId:"own"})}} as any;
  const admin = {id:"admin",role:"ADMIN"}, sales = {id:"sales",role:"SALES"};
  assert.equal(await recordSalesperson(tx,admin,""),null);
  assert.equal(await recordSalesperson(tx,admin,"rep"),"rep");
  assert.equal(await recordSalesperson(tx,admin,undefined,"rep"),"rep");
  assert.equal(await recordSalesperson(tx,admin,"","rep"),null);
  await assert.rejects(()=>recordSalesperson(tx,admin,"unknown"));
  assert.equal(await recordSalesperson(tx,sales,"rep"),"own");
  assert.equal(await recordSalesperson(tx,sales,"rep","original"),"original");
  assert.equal(limaToday(new Date("2026-10-14T04:59:00Z")),"2026-10-13");
  const day = (value:string) => new Date(value+"T09:00:00Z");
  const now = new Date("2026-10-14T05:00:00Z");
  assert.equal(scheduledServiceStatus("SCHEDULED",[day("2026-10-13")],now),"EXECUTED");
  assert.equal(scheduledServiceStatus("SCHEDULED",[day("2026-10-13"),day("2026-10-15")],now),"SCHEDULED");
  assert.equal(scheduledServiceStatus("SCHEDULED",[day("2026-10-14")],now),"SCHEDULED");
  assert.equal(scheduledServiceStatus("SCHEDULED",[],now),"SCHEDULED");
  assert.equal(scheduledServiceStatus("INVOICED",[day("2026-10-13")],now),"INVOICED");
  assert.equal(scheduledServiceStatus("SCHEDULED",[day("2026-10-13")],new Date("2026-10-14T04:59:00Z")),"SCHEDULED");
  const original = prisma.service.updateMany;
  let query: any;
  (prisma.service as any).updateMany=async(args:any)=>{query=args;return {count:1}};
  try {
    await executePastServices(new Date("2026-10-14T05:00:00Z"));
    assert.equal(query.where.status,"SCHEDULED");
    assert.equal(query.where.deletedAt,null);
    assert.equal(query.where.certificatesOnly,false);
    assert.equal(query.where.OR[0].dates.none.date.gte.toISOString(),"2026-10-14T00:00:00.000Z");
    assert.equal(query.where.OR[1].serviceDate.lt.toISOString(),"2026-10-14T00:00:00.000Z");
    assert.deepEqual(query.data,{status:"EXECUTED"});
  } finally {(prisma.service as any).updateMany=original;}
  console.log("Service requirements checks passed.");
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
