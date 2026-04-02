/// <reference types="node" />
import { NextResponse } from 'next/server';
import { SUPPORT_COOKIE_NAME } from '@/lib/support/session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SUPPORT_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
