import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Rota desativada. Use o módulo de suporte client-side.' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'Rota desativada. Use o módulo de suporte client-side.' }, { status: 410 });
}
