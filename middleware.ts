/// <reference types="node" />
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'smartpark_support_session';

function base64UrlToText(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + padding);
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function verifyCookie(cookieValue?: string) {
  if (!cookieValue) return null;
  const [encodedPayload, signature] = cookieValue.split('.');
  if (!encodedPayload || !signature) return null;

  const secret = process.env.SUPPORT_SESSION_SECRET || process.env.SUPPORT_PASSWORD;
  if (!secret) return null;

  try {
    const payloadText = base64UrlToText(encodedPayload);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadText));
    const expectedSignature = arrayBufferToBase64Url(signed);
    if (expectedSignature !== signature) return null;

    const payload = JSON.parse(payloadText) as { exp?: number };
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifyCookie(request.cookies.get(COOKIE_NAME)?.value);

  if (pathname === '/suporte/login' && session) {
    return NextResponse.redirect(new URL('/suporte/clientes', request.url));
  }

  if (pathname.startsWith('/suporte/clientes') && !session) {
    return NextResponse.redirect(new URL('/suporte/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/suporte/login', '/suporte/clientes/:path*'],
};
