import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const { loadRolePermissionAssignment, saveRolePermissionAssignment } =
  await import('../../src/modules/tenant/role-permission-assignment.ts');

beforeEach(() => {
  api.post.mockReset();
});

describe('role permission assignment', () => {
  it('loads only assignable permissions and maps the current role selection', async () => {
    const signal = new AbortController().signal;
    api.post
      .mockResolvedValueOnce([
        {
          action: 'read',
          id: 'permission-read',
          name: '查看成员',
          permission_key: 'tenant.member.read',
          resource: 'tenant.member',
        },
      ])
      .mockResolvedValueOnce([
        {
          action: 'read',
          id: 'permission-read',
          name: '查看成员',
          permission_key: 'tenant.member.read',
          resource: 'tenant.member',
        },
      ]);

    await expect(
      loadRolePermissionAssignment('role-1', signal),
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
      '/tenant-authorization/assignable-permissions',
      {},
      { signal },
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/tenant-roles/permissions/get',
      { id: 'role-1' },
      { signal },
    );
  });

  it('saves the optimistic version and selected permission IDs', async () => {
    api.post.mockResolvedValue(undefined);

    await saveRolePermissionAssignment({ id: 'role-1', version: 7 }, [
      'permission-read',
      'permission-update',
    ]);

    expect(api.post).toHaveBeenCalledWith('/tenant-roles/permissions/set', {
      permission_ids: ['permission-read', 'permission-update'],
      role_id: 'role-1',
      version: 7,
    });
  });
});
