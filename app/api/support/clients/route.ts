/// <reference types="node" />
import { randomBytes, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { createDocument, listDocuments, patchDocument } from '@/lib/support/firestore-rest';
import { verifySupportAccess } from '@/lib/support/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ClientTokenStatus = 'PENDENTE' | 'UTILIZADO' | 'EXPIRADO';

type ClientTokenItem = {
  id: string;
  _name: string;
  nome?: string;
  email?: string;
  tenantId?: string;
  token?: string;
  status?: ClientTokenStatus | string;
  criadoEm?: string;
  expiraEm?: string;
  utilizadoEm?: string | null;
};

function unauthorized() {
  return NextResponse.json({ error: 'Acesso permitido apenas para usuários com cargo de suporte.' }, { status: 401 });
}

function normalizeClientTokenStatus(doc: ClientTokenItem): ClientTokenStatus {
  const now = Date.now();
  const expiraEm = doc.expiraEm ? Date.parse(doc.expiraEm) : 0;

  if (doc.status === 'UTILIZADO') return 'UTILIZADO';
  if (doc.status === 'EXPIRADO') return 'EXPIRADO';
  if (expiraEm && expiraEm < now) return 'EXPIRADO';
  return 'PENDENTE';
}

function getDateValue(value?: string) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function GET(request: Request) {
  const supportUser = await verifySupportAccess(request);
  if (!supportUser) return unauthorized();

  try {
    const docs = (await listDocuments('client_tokens')) as ClientTokenItem[];

    const normalized = await Promise.all(
      docs.map(async (doc) => {
        const status = normalizeClientTokenStatus(doc);

        if (status !== doc.status) {
          await patchDocument('client_tokens', doc.id, { status });
        }

        return { ...doc, status };
      })
    );

    normalized.sort((a, b) => getDateValue(b.criadoEm) - getDateValue(a.criadoEm));

    return NextResponse.json({ items: normalized });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar clientes.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const supportUser = await verifySupportAccess(request);
  if (!supportUser) return unauthorized();

  try {
    const { nome, email } = (await request.json()) as { nome?: string; email?: string };

    if (!nome?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
    }

    const now = new Date();
    const expiraEm = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tenantId = randomUUID();
    const token = randomBytes(16).toString('hex');

    const created = await createDocument('client_tokens', {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      tenantId,
      token,
      status: 'PENDENTE',
      criadoEm: now,
      expiraEm,
      utilizadoEm: null,
      criadoPorUid: supportUser.uid,
      criadoPorEmail: supportUser.email,
    });

    return NextResponse.json({
      item: created,
      token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar cliente.' },
      { status: 500 }
    );
  }
}
