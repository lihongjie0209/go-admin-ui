import { requestClient } from '#/api/request';

import {
  clearPersistedTenantContext,
  getPersistedTenantContext,
  persistTenantContext,
} from './tenant-context-storage';

export interface AvailableTenantContext {
  is_administrator: boolean;
  joined_at: string;
  membership_id: string;
  tenant_code: string;
  tenant_id: string;
  tenant_name: string;
}

interface TenantContextToken {
  access_token: string;
  expires_in: number;
  tenant: AvailableTenantContext;
  token_type: string;
}

export function getAvailableTenantContexts(signal?: AbortSignal) {
  return requestClient.post<AvailableTenantContext[]>(
    '/tenant-context/available',
    {},
    { signal },
  );
}

export async function switchTenantContext(
  tenantID: string,
  signal?: AbortSignal,
) {
  const result = await requestClient.post<TenantContextToken>(
    '/tenant-context/switch',
    { tenant_id: tenantID },
    { signal },
  );
  persistTenantContext(result.tenant);
  return result;
}

export async function resolveInitialTenantContext(signal?: AbortSignal) {
  const available = await getAvailableTenantContexts(signal);
  const persisted = getPersistedTenantContext();
  const selected =
    available.find((item) => item.tenant_id === persisted?.tenant_id) ??
    (available.length === 1 ? available[0] : undefined);
  if (!selected) {
    clearPersistedTenantContext();
    return { available, token: null };
  }
  const token = await switchTenantContext(selected.tenant_id, signal);
  return { available, token };
}

export {
  clearPersistedTenantContext,
  getPersistedTenantContext,
  persistTenantContext,
};
