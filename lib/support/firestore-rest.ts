/// <reference types="node" />
import 'server-only';

type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | Date
  | FirestoreValue[]
  | { [key: string]: FirestoreValue };

const FIREBASE_AUTH_BASE = 'https://oauth2.googleapis.com/token';

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável obrigatória não definida: ${name}`);
  }
  return value;
}

function getProjectId() {
  return requiredEnv('FIREBASE_PROJECT_ID');
}

function getServiceAccountEmail() {
  return requiredEnv('FIREBASE_SERVICE_ACCOUNT_EMAIL');
}

function getPrivateKey() {
  return requiredEnv('FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n');
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function signJwt(unsignedJwt: string) {
  const crypto = await import('crypto');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer.sign(getPrivateKey());
  return base64Url(signature);
}

async function createAccessTokenAssertion() {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: getServiceAccountEmail(),
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/userinfo.email',
    aud: FIREBASE_AUTH_BASE,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsignedJwt = `${encodedHeader}.${encodedPayload}`;
  const signature = await signJwt(unsignedJwt);

  return `${unsignedJwt}.${signature}`;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getAdminAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const assertion = await createAccessTokenAssertion();

  const response = await fetch(FIREBASE_AUTH_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data?.error_description || data?.error || 'Falha ao obter access token do Firebase.');
  }

  cachedAccessToken = {
    token: data.access_token as string,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  };

  return cachedAccessToken.token;
}

function getFirestoreBaseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${getProjectId()}/databases/(default)/documents`;
}

function isIsoDate(value: string) {
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && value.includes('T');
}

function encodeFirestoreValue(value: FirestoreValue): any {
  if (value === null) return { nullValue: null };

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => encodeFirestoreValue(item)),
      },
    };
  }

  switch (typeof value) {
    case 'string':
      if (isIsoDate(value)) return { timestampValue: value };
      return { stringValue: value };
    case 'number':
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case 'boolean':
      return { booleanValue: value };
    case 'object':
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, encodeFirestoreValue(item as FirestoreValue)])
          ),
        },
      };
    default:
      return { stringValue: String(value) };
  }
}

function decodeFirestoreValue(value: any): any {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;

  if ('arrayValue' in value) {
    return (value.arrayValue?.values || []).map((item: any) => decodeFirestoreValue(item));
  }

  if ('mapValue' in value) {
    const fields = value.mapValue?.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([key, item]) => [key, decodeFirestoreValue(item)])
    );
  }

  return null;
}

export function mapFirestoreDocument(document: any) {
  const fields = document?.fields || {};
  const mapped = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );

  const fullName = document?.name || '';
  const id = fullName.split('/').pop() || '';

  return {
    id,
    _name: fullName,
    ...mapped,
  };
}

export async function getDocumentByPath(path: string, accessToken?: string) {
  const token = accessToken || (await getAdminAccessToken());

  const response = await fetch(`${getFirestoreBaseUrl()}/${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    const data = await response.text();
    throw new Error(data || `Erro ao buscar documento ${path}.`);
  }

  return response.json();
}

export async function listDocuments(collection: string, accessToken?: string) {
  const token = accessToken || (await getAdminAccessToken());

  const response = await fetch(`${getFirestoreBaseUrl()}/${collection}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (response.status === 404) return [];

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Erro ao listar documentos de ${collection}.`);
  }

  return (data.documents || []).map((doc: any) => mapFirestoreDocument(doc));
}

export async function createDocument(
  collection: string,
  payload: Record<string, FirestoreValue>,
  accessToken?: string
) {
  const token = accessToken || (await getAdminAccessToken());

  const response = await fetch(`${getFirestoreBaseUrl()}/${collection}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, encodeFirestoreValue(value)])
      ),
    }),
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Erro ao criar documento em ${collection}.`);
  }

  return mapFirestoreDocument(data);
}

export async function patchDocument(
  collection: string,
  id: string,
  payload: Record<string, FirestoreValue>,
  accessToken?: string
) {
  const token = accessToken || (await getAdminAccessToken());
  const params = new URLSearchParams();

  Object.keys(payload).forEach((key) => {
    params.append('updateMask.fieldPaths', key);
  });

  const response = await fetch(`${getFirestoreBaseUrl()}/${collection}/${id}?${params.toString()}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, encodeFirestoreValue(value)])
      ),
    }),
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Erro ao atualizar documento ${collection}/${id}.`);
  }

  return mapFirestoreDocument(data);
}