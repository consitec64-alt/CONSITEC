import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { prisma } from '@/lib/prisma';
import { quotationActor, quotationOwner, quotationError, QuotationError } from '@/lib/quotations';
export async function POST(req: Request) {
  try {
    const actor = await quotationActor(), body = await req.json() as HandleUploadBody;
    if (body?.type !== 'blob.generate-client-token') throw new QuotationError('Carga inválida');
    let documentId;
    try { documentId = JSON.parse(body.payload.clientPayload ?? '{}').documentId; }
    catch { throw new QuotationError('Carga inválida'); }
    const doc = await prisma.quotationDocument.findFirst({ where: { id: typeof documentId === 'string' ? documentId : '__none__', pathname: body.payload.pathname, storageProvider: 'BLOB', state: 'PENDING', createdAt: { gt: new Date(Date.now() - 86400000) }, quotation: quotationOwner(actor) } });
    if (!doc) throw new QuotationError('Carga no autorizada', 403);
    const result = await handleUpload({ request: req, body, onBeforeGenerateToken: async pathname => {
      if (pathname !== doc.pathname) throw new QuotationError('Carga no autorizada', 403);
      return { allowedContentTypes: ['application/pdf'], maximumSizeInBytes: doc.size, validUntil: Date.now() + 180000, addRandomSuffix: false, allowOverwrite: false };
    } });
    return NextResponse.json(result);
  } catch (error) { return quotationError(error); }
}
