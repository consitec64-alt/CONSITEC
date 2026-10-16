import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// Old clients must not accidentally replace a policy that now covers the whole team.
export async function PATCH() {
  return NextResponse.json({ error: 'La vigencia SCTR ahora es compartida. Guarda sus fechas en el apartado SCTR mensual.', code: 'SHARED_SCTR_POLICY' }, { status: 409 });
}
