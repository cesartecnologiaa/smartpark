/// <reference types="node" />
import 'server-only';

import { createSign, randomUUID } from 'crypto';

type FirestorePrimitive = string | number | boolean | null;
type FirestoreValue = FirestorePrimitive | Date | FirestoreMap | FirestoreValue[];
interface FirestoreMap {
  [key: string]: FirestoreValue;
}

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'smartpark-3ef6a';

const SERVICE_ACCOUNT_EMAIL = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL || '';
const SERVICE_ACCOUNT_PRIVATE_KEY = (process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/datastore';

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function requireServiceAccount() {
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error(
      'Credenciais do backend Firestore ausentes. Defina FIREBASE_SERVICE_ACCOUNT_EMAIL e FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.'
    );
  }
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createServiceAccountJwt() {
  requireServiceAccount();

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: OAUTH_SCOPE,
    aud: OAUTH_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(SERVICE_ACCOUNT_PRIVATE_KEY);

  return `${unsignedToken}.${base64UrlEncode(signature)}`;
}

async function getAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const assertion = createServiceAccountJwt();
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha ao obter token OAuth do Google: ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

function encodeValue(value: FirestoreValue): any {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  switch (typeof value) {
    case 'string':
      return { stringValue: value };
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    case 'object':
      return {
        mapValue: {
          fields: Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, encodeValue(inner)])),
        },
      };
    default:
      throw new Error(`Tipo Firestore não suportado: ${typeof value}`);
  }
}

function decodeValue(value: any): any {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, inner]) => [key, decodeValue(inner)]));
  }
  return null;
}

function decodeDocument(document: any) {
  const fields = document.fields || {};
  const data = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
  const name: string = document.name || '';
  const id = name.split('/').pop() || randomUUID();
  return {
    id,
    _name: name,
    ...data,
  };
}

async function firestoreFetch(path: string, init?: RequestInit) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${FIRESTORE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro Firestore REST (${response.status}): ${errorText}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function createDocument(collectionName: string, data: FirestoreMap, documentId?: string) {
  const query = documentId ? `?documentId=${encodeURIComponent(documentId)}` : '';
  const response = await firestoreFetch(`/${collectionName}${query}`, {
    method: 'POST',
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)])),
    }),
  });

  return decodeDocument(response);
}

export async function listDocuments(collectionName: string) {
  const response = await firestoreFetch(`/${collectionName}`);
  return ((response.documents || []) as any[]).map(decodeDocument);
}

export async function patchDocument(collectionName: string, docId: string, data: FirestoreMap) {
  const mask = Object.keys(data)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join('&');
  const response = await firestoreFetch(`/${collectionName}/${docId}?${mask}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)])),
    }),
  });

  return decodeDocument(response);
}

export async function queryCollectionByField(collectionName: string, field: string, value: string): Promise<any[]> {
  const response = await firestoreFetch(`:runQuery`, {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: { stringValue: value },
          },
        },
        limit: 10,
      },
    }),
  });

  return (response as any[])
    .filter((entry) => entry.document)
    .map((entry) => decodeDocument(entry.document));
}

export async function createSupportSessionRecord(sessionId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return createDocument('support_sessions', {
    sessionId,
    criadoEm: now,
    expiraEm: expiresAt,
  });
}
