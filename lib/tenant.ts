import { Firestore, collection, doc } from 'firebase/firestore';

export const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || 'default';

export function normalizeTenantId(tenantId?: string | null) {
  return tenantId || DEFAULT_TENANT_ID;
}

export function isDefaultTenant(tenantId?: string | null) {
  return normalizeTenantId(tenantId) === DEFAULT_TENANT_ID;
}

export function tenantCollection(db: Firestore, tenantId: string | undefined | null, collectionName: string) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  return isDefaultTenant(normalizedTenantId)
    ? collection(db, collectionName)
    : collection(db, 'tenants', normalizedTenantId, collectionName);
}

export function tenantDoc(db: Firestore, tenantId: string | undefined | null, collectionName: string, docId: string) {
  const normalizedTenantId = normalizeTenantId(tenantId);
  return isDefaultTenant(normalizedTenantId)
    ? doc(db, collectionName, docId)
    : doc(db, 'tenants', normalizedTenantId, collectionName, docId);
}
