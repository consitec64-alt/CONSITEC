import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { head, get, del } from '@vercel/blob';
export type StorageProvider = 'R2' | 'BLOB';
export function r2Configured() { return ['R2_ENDPOINT','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY'].every(name => !!process.env[name]); }
export function uploadProvider(): StorageProvider | null { return r2Configured() ? 'R2' : process.env.BLOB_READ_WRITE_TOKEN ? 'BLOB' : null; }
function client() {
  if (!r2Configured()) throw Error('R2 no está configurado');
  const endpoint = new URL(process.env.R2_ENDPOINT!);
  if (endpoint.protocol !== 'https:' || !endpoint.hostname.endsWith('.r2.cloudflarestorage.com') || endpoint.username || endpoint.password || endpoint.search || endpoint.pathname !== '/') throw Error('Endpoint de R2 inválido');
  return new S3Client({ region: 'auto', endpoint: endpoint.origin, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! }, requestChecksumCalculation: 'WHEN_REQUIRED' });
}
const object = (pathname: string) => ({ Bucket: process.env.R2_BUCKET!, Key: pathname });
export async function signQuotationUpload(pathname: string, size: number) {
  const url = await getSignedUrl(client(), new PutObjectCommand({ ...object(pathname), ContentType: 'application/pdf', ContentLength: size, IfNoneMatch: '*' }), { expiresIn: 180, signableHeaders: new Set(['content-type','content-length','if-none-match']) });
  return { url, headers: { 'Content-Type': 'application/pdf', 'If-None-Match': '*' } };
}
export async function signQuotationDownload(pathname: string, name: string, download: boolean) {
  return getSignedUrl(client(), new GetObjectCommand({
    ...object(pathname), ResponseContentType: 'application/pdf',
    ResponseContentDisposition: `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}`,
    ResponseCacheControl: 'private, no-store'
  }), { expiresIn: 60 });
}
export async function headQuotationFile(provider: string, pathname: string) {
  if (provider === 'BLOB') { const blob = await head(pathname); return { size: blob.size, contentType: blob.contentType }; }
  if (provider !== 'R2') throw Error('Proveedor desconocido');
  const result = await client().send(new HeadObjectCommand(object(pathname)));
  return { size: result.ContentLength, contentType: result.ContentType };
}
export async function getQuotationFile(provider: string, pathname: string) {
  if (provider === 'BLOB') { const blob = await get(pathname, { access: 'private', useCache: false }); return blob?.statusCode === 200 ? blob.stream : null; }
  if (provider !== 'R2') throw Error('Proveedor desconocido');
  const result = await client().send(new GetObjectCommand(object(pathname)));
  return result.Body?.transformToWebStream() ?? null;
}
export async function deleteQuotationFile(provider: string, pathname: string) {
  if (provider === 'BLOB') { await del(pathname); return; }
  if (provider !== 'R2') throw Error('Proveedor desconocido');
  await client().send(new DeleteObjectCommand(object(pathname)));
}
