import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { S3Client, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { uploadProvider, signQuotationDownload, signQuotationUpload, headQuotationFile, getQuotationFile, deleteQuotationFile } from '../lib/quotation-storage.ts';
const names=['R2_ENDPOINT','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','BLOB_READ_WRITE_TOKEN'];
const before=Object.fromEntries(names.map(n=>[n,process.env[n]]));
try {
 for(const n of names)delete process.env[n];
 assert.equal(uploadProvider(),null);
 process.env.BLOB_READ_WRITE_TOKEN='local-test-placeholder';assert.equal(uploadProvider(),'BLOB');
 Object.assign(process.env,{R2_ENDPOINT:'https://00000000000000000000000000000000.r2.cloudflarestorage.com',R2_BUCKET:'test-private',R2_ACCESS_KEY_ID:'local-test-key',R2_SECRET_ACCESS_KEY:'local-test-secret'});
 assert.equal(uploadProvider(),'R2');
 const signed=await signQuotationUpload('quotations/test/file.pdf',14),url=new URL(signed.url);
 assert.equal(url.searchParams.get('X-Amz-Expires'),'180');
 for(const header of ['content-length','content-type','if-none-match'])assert(url.searchParams.get('X-Amz-SignedHeaders').split(';').includes(header));
 assert.equal(signed.headers['If-None-Match'],'*');
 for(const download of [false,true]){
  const read=new URL(await signQuotationDownload('quotations/test/file.pdf','Cotización.pdf',download));
  assert.equal(read.searchParams.get('X-Amz-Expires'),'60');
  assert.equal(read.searchParams.get('response-content-type'),'application/pdf');
  assert.match(read.searchParams.get('response-content-disposition'),download?/^attachment;/:/^inline;/);
  assert(read.searchParams.get('response-content-disposition').includes('Cotizaci%C3%B3n.pdf'));
  assert.equal(read.searchParams.get('response-cache-control'),'private, no-store');
 }

 const requests=[];
 const send=mock.method(S3Client.prototype,'send',async command=>{
  requests.push(command);assert.equal(command.input.Bucket,'test-private');assert.equal(command.input.Key,'quotations/test/file.pdf');
  if(command instanceof HeadObjectCommand)return {ContentLength:14,ContentType:'application/pdf'};
  if(command instanceof GetObjectCommand)return {Body:{transformToWebStream:()=>new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('%PDF-1.4 test'));c.close();}})}};
  assert(command instanceof DeleteObjectCommand);return {};
 });
 assert.deepEqual(await headQuotationFile('R2','quotations/test/file.pdf'),{size:14,contentType:'application/pdf'});
 const stream=await getQuotationFile('R2','quotations/test/file.pdf');assert.match(await new Response(stream).text(),/^%PDF-/);
 await deleteQuotationFile('R2','quotations/test/file.pdf');assert.equal(requests.length,3);send.mock.restore();
 process.env.R2_ENDPOINT='http://example.com';await assert.rejects(signQuotationUpload('quotations/test/file.pdf',14),/Endpoint/);
 console.log('PASS storage adapter: provider selection, signed size/type/no-overwrite headers, expiry, private read/delete command mapping and endpoint validation. SDK read/delete transport mocked; no live R2 requests.');
}finally{mock.restoreAll();for(const n of names){if(before[n]===undefined)delete process.env[n];else process.env[n]=before[n];}}
