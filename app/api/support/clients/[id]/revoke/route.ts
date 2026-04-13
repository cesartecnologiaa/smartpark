/// <reference types="node" />
import { NextResponse } from 'next/server';

import { patchDocument } from '@/lib/support/firestore-rest';
import { verifySupportAccess } from '@/lib/support/auth';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supportUser = await verifySupportAccess(request);
  if (!supportUser) {
    return NextResponse.json({ error: 'Acesso permitido apenas para usuários com cargo de suporte.' }, { status: 401 });
  }

  try {
    const item = await patchDocument('client_tokens', params.id, {
      status: 'EXPIRADO',
      revogadoEm: new Date(),
      revogadoPorUid: supportUser.uid,
      revogadoPorEmail: supportUser.email,
    });
    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao revogar token.' }, { status: 500 });
  }
}
