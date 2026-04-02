/// <reference types="node" />
import { randomBytes, randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createDocument, listDocuments, patchDocument } from '@/lib/support/firestore-rest';
import { SUPPORT_COOKIE_NAME, verifySupportSessionCookie } from '@/lib/support/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'Sessão de suporte inválida.' }, { status: 401 });
}

function ensureSupportSession() {
  const payload = verifySupportSessionCookie(cookies().get(SUPPORT_COOKIE_NAME)?.value);
  if (!payload) return null;
  return payload;
}

function normalizeClientTokenStatus(doc: any) {
  const now = Date.now();
  const expiraEm = doc.expiraEm ? Date.parse(doc.expiraEm) : 0;
  if (doc.status === 'PENDENTE' && expiraEm && expiraEm < now) {
    return 'EXPIRADO';
  }
  return doc.status || 'PENDENTE';
}

export async function GET() {
  if (!ensureSupportSession()) return unauthorized();

  try {
    const docs = await listDocuments('client_tokens');
    const normalized = await Promise.all(
      docs.map(async (doc) => {
        const status = normalizeClientTokenStatus(doc);
        if (status !== doc.status) {
          await patchDocument('client_tokens', doc.id, { status });
        }
        return { ...doc, status };
      })
    );

    normalized.sort((a, b) => Date.parse(b.criadoEm || 0) - Date.parse(a.criadoEm || 0));
    return NextResponse.json({ items: normalized });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao buscar clientes.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!ensureSupportSession()) return unauthorized();

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
    });

    return NextResponse.json({
      item: created,
      token,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao criar cliente.' }, { status: 500 });
  }
}
