import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const { loadMemberRoleAssignment, saveMemberRoleAssignment } =
  await import('../../src/modules/tenant/member-role-assignment.ts');

beforeEach(() => {
  api.post.mockReset();
});

describe('tenant member role assignment', () => {
  it('loads active role candidates and assigned roles with one cancellation boundary', async () => {
    const signal = new AbortController().signal;
    api.post
      .mockResolvedValueOnce({
        items: [
          { code: 'auditor', id: 'role-1', name: '审计员' },
          { code: 'operator', id: 'role-2', name: '操作员' },
        ],
      })
      .mockResolvedValueOnce([{ id: 'role-2' }]);

    await expect(
      loadMemberRoleAssignment('membership-1', signal),
    ).resolves.toEqual({
      items: [
        { description: 'auditor', id: 'role-1', name: '审计员' },
        { description: 'operator', id: 'role-2', name: '操作员' },
      ],
      selected: ['role-2'],
    });
    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/tenant-roles/page',
      {
        keyword: '',
        page: 1,
        page_size: 200,
        statuses: ['active'],
      },
      { signal },
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/tenant-members/roles/get',
      { membership_id: 'membership-1' },
      { signal },
    );
  });

  it('saves the selected role IDs with the membership optimistic-lock version', async () => {
    api.post.mockResolvedValue(undefined);

    await saveMemberRoleAssignment({ id: 'membership-1', version: 7 }, [
      'role-1',
      'role-2',
    ]);

    expect(api.post).toHaveBeenCalledExactlyOnceWith(
      '/tenant-members/roles/set',
      {
        membership_id: 'membership-1',
        role_ids: ['role-1', 'role-2'],
        version: 7,
      },
    );
  });

  it('does not hide either dependency failure from the caller', async () => {
    const failure = new Error('role service unavailable');
    api.post
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce([{ id: 'role-2' }]);

    await expect(loadMemberRoleAssignment('membership-1')).rejects.toBe(
      failure,
    );
  });
});
