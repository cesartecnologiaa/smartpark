/// <reference types="node" />
import { NextResponse } from 'next/server';
import { createSupportSessionRecord } from '@/lib/support/firestore-rest';
import { createSupportSessionCookie, SUPPORT_COOKIE_NAME } from '@/lib/support/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string };

    const supportEmail = process.env.SUPPORT_EMAIL;
    const supportPassword = process.env.SUPPORT_PASSWORD;

    if (!supportEmail || !supportPassword) {
      return NextResponse.json(
        { error: 'SUPPORT_EMAIL e SUPPORT_PASSWORD precisam estar configurados no ambiente.' },
        { status: 500 }
      );
    }

    if (email !== supportEmail || password !== supportPassword) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const session = createSupportSessionCookie(supportEmail);

    try {
      await createSupportSessionRecord(session.payload.sid);
    } catch (error) {
      console.error('Falha ao registrar support_sessions:', error);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SUPPORT_COOKIE_NAME,
      value: session.value,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: session.maxAgeSeconds,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Não foi possível iniciar a sessão.' }, { status: 500 });
  }
}
