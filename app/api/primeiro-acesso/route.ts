/// <reference types="node" />
import { NextResponse } from 'next/server';
import { patchDocument, queryCollectionByField } from '@/lib/support/firestore-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ClientTokenDoc = {
  id: string;
  status?: 'PENDENTE' | 'UTILIZADO' | 'EXPIRADO' | string;
  expiraEm?: string;
  email?: string;
  nome?: string;
  tenantId?: string;
};

function resolveTokenState(doc: ClientTokenDoc | undefined) {
  if (!doc) return { valid: false, reason: 'Token inválido' };
  if (doc.status === 'UTILIZADO') return { valid: false, reason: 'Token já utilizado' };
  const expiresAt = doc.expiraEm ? Date.parse(doc.expiraEm) : 0;
  if (doc.status === 'EXPIRADO' || (expiresAt && expiresAt < Date.now())) {
    return { valid: false, reason: 'Token expirado' };
  }
  if (doc.status !== 'PENDENTE') return { valid: false, reason: 'Token inválido' };
  return { valid: true as const };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: 'validate' | 'finalize'; token?: string; docId?: string };

    if (body.action === 'validate') {
      const token = body.token?.trim();
      if (!token) {
        return NextResponse.json({ error: 'Informe o token de acesso.' }, { status: 400 });
      }

      const matches = (await queryCollectionByField('client_tokens', 'token', token)) as ClientTokenDoc[];
      const doc = matches[0];
      const state = resolveTokenState(doc);
      if (!state.valid) {
        return NextResponse.json({ error: state.reason }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        tokenDoc: {
          id: doc.id,
          email: doc.email,
          nome: doc.nome,
          tenantId: doc.tenantId,
        },
      });
    }

    if (body.action === 'finalize') {
      if (!body.docId) {
        return NextResponse.json({ error: 'Documento do token não informado.' }, { status: 400 });
      }

      const updated = await patchDocument('client_tokens', body.docId, {
        status: 'UTILIZADO',
        utilizadoEm: new Date(),
      });

      return NextResponse.json({ ok: true, item: updated });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro no primeiro acesso.' }, { status: 500 });
  }
}
