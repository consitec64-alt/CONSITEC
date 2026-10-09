import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { purgeExpired } from '@/lib/trash';
export const dynamic = 'force-dynamic';
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 const received=req.headers.get('authorization')||'';
 const expected=`Bearer ${secret}`;
 if(!secret||Buffer.byteLength(received)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(received),Buffer.from(expected)))return NextResponse.json({error:'No autorizado'},{status:401});
 await purgeExpired();return NextResponse.json({ok:true});
}
