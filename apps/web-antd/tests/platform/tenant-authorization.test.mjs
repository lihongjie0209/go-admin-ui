import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const {
  loadTenantPermissionCeiling,
  pageAdministratorCandidates,
  saveTenantPermissionCeiling,
  setTenantAdministrator,
} = await import('../../src/modules/platform/tenant-authorization.ts');

beforeEach(() => {
  api.post.mockReset();
});

describe('platform tenant authorization', () => {
  it('loads active permission leaves and the tenant ceiling with cancellation', async () => {
    const signal = new AbortController().signal;
    api.post
      .mockResolvedValueOnce([
        {
          action: '',
          children: [
            {
              action: 'read',
              children: [],
              id: 'permission-read',
              name: '查看成员',
              node_type: 'permission',
              permission_key: 'tenant.member.read',
              resource: 'tenant.member',
              status: 'active',
            },
          ],
          id: 'group-member',
          name: '成员',
          node_type: 'group',
          permission_key: 'tenant.member',
          resource: '',
          status: 'active',
        },
      ])
      .mockResolvedValueOnce([{ id: 'permission-read' }]);

    await expect(
      loadTenantPermissionCeiling('tenant-1', signal),
    ).resolves.toEqual({
      items: [
        {
          description: 'tenant.member.read · tenant.member:read',
          id: 'permission-read',
          name: '查看成员',
        },
      ],
      selected: ['permission-read'],
    });
    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/permissions/tree',
      {
        keyword: '',
        node_types: ['group', 'permission'],
        statuses: ['active'],
      },
      { signal },
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/platform/tenant-authorization/permissions/get',
      { tenant_id: 'tenant-1' },
      { signal },
    );
  });

  it('saves the tenant version with the selected permission IDs', async () => {
    api.post.mockResolvedValue({});
    await saveTenantPermissionCeiling(
      { id: 'tenant-1', name: '租户一', version: 7 },
      ['permission-read'],
    );
    expect(api.post).toHaveBeenCalledWith(
      '/platform/tenant-authorization/permissions/set',
      {
        permission_ids: ['permission-read'],
        tenant_id: 'tenant-1',
        version: 7,
      },
    );
  });

  it('pages administrator candidates within the selected tenant', async () => {
    const signal = new AbortController().signal;
    const request = { page: 1, page_size: 20, tenant_id: 'tenant-1' };
    api.post.mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0 });
    await pageAdministratorCandidates(request, signal);
    expect(api.post).toHaveBeenCalledWith(
      '/platform/tenant-authorization/administrators/page',
      request,
      { signal },
    );
  });

  it('sets one membership administrator assignment at a time', async () => {
    api.post.mockResolvedValue({});
    const input = {
      enabled: true,
      membership_id: 'member-1',
      tenant_id: 'tenant-1',
    };
    await setTenantAdministrator(input);
    expect(api.post).toHaveBeenCalledWith(
      '/platform/tenant-authorization/administrators/set',
      input,
    );
  });

  it('uses tenant-scoped administrator endpoints without a selectable tenant', async () => {
    const signal = new AbortController().signal;
    const request = { keyword: '', page: 1, page_size: 20 };
    const input = {
      enabled: false,
      membership_id: 'member-2',
      tenant_id: 'tenant-1',
    };
    api.post.mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0 });

    await pageAdministratorCandidates(request, signal, 'tenant');
    await setTenantAdministrator(input, 'tenant');

    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/tenant-authorization/administrators/page',
      request,
      { signal },
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/tenant-authorization/administrators/set',
      input,
    );
  });
});
