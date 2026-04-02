/// <reference types="node" />
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { patchDocument } from '@/lib/support/firestore-rest';
import { SUPPORT_COOKIE_NAME, verifySupportSessionCookie } from '@/lib/support/session';

export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const payload = verifySupportSessionCookie(cookies().get(SUPPORT_COOKIE_NAME)?.value);
  if (!payload) {
    return NextResponse.json({ error: 'Sessão de suporte inválida.' }, { status: 401 });
  }

  try {
    const item = await patchDocument('client_tokens', params.id, { status: 'EXPIRADO' });
    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao revogar token.' }, { status: 500 });
  }
}
