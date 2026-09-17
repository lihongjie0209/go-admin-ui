import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const { getEffectivePermissions } =
  await import('../../src/modules/tenant/effective-permissions.ts');

beforeEach(() => {
  api.post.mockReset();
});

describe('tenant effective permissions', () => {
  it('loads the display contract for one membership with cancellation', async () => {
    const signal = new AbortController().signal;
    const permissions = [
      {
        action: 'read',
        id: 'permission-1',
        name: '查看成员',
        permission_key: 'tenant.member.read',
        resource: 'tenant.member',
      },
    ];
    api.post.mockResolvedValue(permissions);

    await expect(
      getEffectivePermissions('membership-1', signal),
    ).resolves.toEqual(permissions);
    expect(api.post).toHaveBeenCalledWith(
      '/tenant-authorization/effective-permissions',
      { membership_id: 'membership-1' },
      { signal },
    );
  });
});
