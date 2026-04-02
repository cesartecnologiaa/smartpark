/// <reference types="node" />
import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

export const SUPPORT_COOKIE_NAME = 'smartpark_support_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function getSessionSecret() {
  const secret = process.env.SUPPORT_SESSION_SECRET || process.env.SUPPORT_PASSWORD;
  if (!secret) {
    throw new Error('Defina SUPPORT_SESSION_SECRET ou SUPPORT_PASSWORD para assinar a sessão de suporte.');
  }
  return secret;
}

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64');
}

function signPayload(rawPayload: string) {
  return toBase64Url(createHmac('sha256', getSessionSecret()).update(rawPayload).digest());
}

export interface SupportSessionPayload {
  sid: string;
  email: string;
  exp: number;
}

export function createSupportSessionCookie(email: string) {
  const payload: SupportSessionPayload = {
    sid: randomUUID(),
    email,
    exp: Date.now() + SESSION_DURATION_MS,
  };

  const rawPayload = JSON.stringify(payload);
  const encodedPayload = toBase64Url(rawPayload);
  const signature = signPayload(rawPayload);

  return {
    value: `${encodedPayload}.${signature}`,
    payload,
    maxAgeSeconds: Math.floor(SESSION_DURATION_MS / 1000),
  };
}

export function verifySupportSessionCookie(cookieValue?: string | null): SupportSessionPayload | null {
  if (!cookieValue) return null;
  const [encodedPayload, signature] = cookieValue.split('.');
  if (!encodedPayload || !signature) return null;

  try {
    const rawPayload = fromBase64Url(encodedPayload).toString('utf8');
    const expectedSignature = signPayload(rawPayload);
    const isValidSignature = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

    if (!isValidSignature) return null;

    const payload = JSON.parse(rawPayload) as SupportSessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
