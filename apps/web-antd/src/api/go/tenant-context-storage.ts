export interface PersistedTenantContext {
  is_administrator: boolean;
  membership_id: string;
  tenant_code: string;
  tenant_id: string;
  tenant_name: string;
}

const storageKey = 'go-admin.current-tenant';

export function clearPersistedTenantContext() {
  localStorage.removeItem(storageKey);
}

export function getPersistedTenantContext() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PersistedTenantContext;
    if (
      !value.tenant_id ||
      !value.membership_id ||
      !value.tenant_code ||
      !value.tenant_name
    ) {
      clearPersistedTenantContext();
      return null;
    }
    return value;
  } catch {
    clearPersistedTenantContext();
    return null;
  }
}

export function persistTenantContext(context: PersistedTenantContext) {
  localStorage.setItem(storageKey, JSON.stringify(context));
  window.dispatchEvent(
    new CustomEvent('go-admin:tenant-context-changed', { detail: context }),
  );
}

export async function restorePersistedTenantContext(
  switcher: (tenantID: string) => Promise<{
    access_token: string;
    tenant: PersistedTenantContext;
  }>,
) {
  const tenant = getPersistedTenantContext();
  if (!tenant) return null;
  try {
    const result = await switcher(tenant.tenant_id);
    persistTenantContext(result.tenant);
    return result.access_token;
  } catch (error) {
    clearPersistedTenantContext();
    throw error;
  }
}
