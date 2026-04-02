import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SUPPORT_COOKIE_NAME, verifySupportSessionCookie } from '@/lib/support/session';

export async function GET() {
  const cookieStore = cookies();
  const payload = verifySupportSessionCookie(cookieStore.get(SUPPORT_COOKIE_NAME)?.value);

  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, email: payload.email, expiresAt: payload.exp });
}
