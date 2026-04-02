import { NextResponse } from 'next/server';

import { ensureSupportSession } from '@/lib/support/session';
import {
  listDocuments,
  normalizeClientTokenStatus,
  patchDocument,
} from '@/lib/support/firestore-rest';

type ClientTokenItem = {
  id: string;
  _name: string;
  nome?: string;
  email?: string;
  tenantId?: string;
  token?: string;
  status?: 'PENDENTE' | 'UTILIZADO' | 'EXPIRADO' | string;
  criadoEm?: string;
  expiraEm?: string;
  utilizadoEm?: string | null;
};

const unauthorized = () =>
  NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

const getDateValue = (value?: string) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export async function GET() {
  if (!ensureSupportSession()) return unauthorized();

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

    normalized.sort(
      (a, b) => getDateValue(b.criadoEm) - getDateValue(a.criadoEm)
    );

    return NextResponse.json({ items: normalized });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar clientes.' },
      { status: 500 }
    );
  }
}