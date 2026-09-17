import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const {
  getAvailableTenantContexts,
  getPersistedTenantContext,
  resolveInitialTenantContext,
  switchTenantContext,
} = await import('../../src/api/go/tenant-context.ts');
const { persistTenantContext, restorePersistedTenantContext } =
  await import('../../src/api/go/tenant-context-storage.ts');

const tenant = {
  is_administrator: true,
  joined_at: '2026-09-18T09:00:00+08:00',
  membership_id: 'membership-1',
  tenant_code: 'acme',
  tenant_id: 'tenant-1',
  tenant_name: '示例租户',
};

beforeEach(() => {
  api.post.mockReset();
  localStorage.clear();
});

describe('tenant context API', () => {
  it('loads available tenants with cancellation', async () => {
    const signal = new AbortController().signal;
    api.post.mockResolvedValue([tenant]);
    await expect(getAvailableTenantContexts(signal)).resolves.toEqual([tenant]);
    expect(api.post).toHaveBeenCalledWith(
      '/tenant-context/available',
      {},
      { signal },
    );
  });

  it('switches and persists only the server-validated tenant context', async () => {
    api.post.mockResolvedValue({
      access_token: 'scoped-access-token',
      expires_in: 900,
      tenant,
      token_type: 'Bearer',
    });
    await expect(switchTenantContext('tenant-1')).resolves.toMatchObject({
      access_token: 'scoped-access-token',
    });
    expect(api.post).toHaveBeenCalledWith(
      '/tenant-context/switch',
      { tenant_id: 'tenant-1' },
      { signal: undefined },
    );
    expect(getPersistedTenantContext()).toMatchObject({
      membership_id: 'membership-1',
      tenant_id: 'tenant-1',
    });
  });

  it('automatically selects the only available tenant', async () => {
    api.post.mockResolvedValueOnce([tenant]).mockResolvedValueOnce({
      access_token: 'scoped-access-token',
      expires_in: 900,
      tenant,
      token_type: 'Bearer',
    });
    await expect(resolveInitialTenantContext()).resolves.toMatchObject({
      available: [tenant],
      token: { access_token: 'scoped-access-token' },
    });
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/tenant-context/switch',
      { tenant_id: 'tenant-1' },
      { signal: undefined },
    );
  });

  it('requires explicit selection when multiple tenants have no valid persisted choice', async () => {
    api.post.mockResolvedValue([
      tenant,
      {
        ...tenant,
        membership_id: 'membership-2',
        tenant_code: 'beta',
        tenant_id: 'tenant-2',
        tenant_name: '第二租户',
      },
    ]);
    await expect(resolveInitialTenantContext()).resolves.toMatchObject({
      token: null,
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(getPersistedTenantContext()).toBeNull();
  });

  it('ignores a stale persisted tenant that is no longer available', async () => {
    localStorage.setItem(
      'go-admin.current-tenant',
      JSON.stringify({ ...tenant, tenant_id: 'tenant-removed' }),
    );
    api.post.mockResolvedValue([
      tenant,
      {
        ...tenant,
        membership_id: 'membership-2',
        tenant_code: 'beta',
        tenant_id: 'tenant-2',
      },
    ]);
    await expect(resolveInitialTenantContext()).resolves.toMatchObject({
      token: null,
    });
    expect(getPersistedTenantContext()).toBeNull();
  });

  it('restores a scoped access token after refresh', async () => {
    persistTenantContext(tenant);
    const switcher = vi.fn().mockResolvedValue({
      access_token: 'restored-scoped-token',
      tenant,
    });
    await expect(restorePersistedTenantContext(switcher)).resolves.toBe(
      'restored-scoped-token',
    );
    expect(switcher).toHaveBeenCalledWith('tenant-1');
  });

  it('clears stale tenant state when refresh context restoration fails', async () => {
    persistTenantContext(tenant);
    await expect(
      restorePersistedTenantContext(() => Promise.reject(new Error('revoked'))),
    ).rejects.toThrow('revoked');
    expect(getPersistedTenantContext()).toBeNull();
  });
});
