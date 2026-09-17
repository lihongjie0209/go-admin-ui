import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const { loadDepartmentMemberAssignment, saveDepartmentMemberAssignment } =
  await import('../../src/modules/tenant/department-member-assignment.ts');

beforeEach(() => {
  api.post.mockReset();
});

describe('department member assignment', () => {
  it('loads every member page and current assignments with one cancellation signal', async () => {
    const signal = new AbortController().signal;
    api.post.mockImplementation((path, body, _options) => {
      if (path === '/tenant-departments/members/get') {
        return Promise.resolve([
          {
            display_name: '张三',
            is_primary: true,
            joined_at: '2026-09-18T09:00:00+08:00',
            membership_id: 'member-1',
            status: 'active',
            user_id: 'user-1',
            username: 'zhangsan',
          },
        ]);
      }
      const page = body.page;
      return Promise.resolve({
        items:
          page === 1
            ? [
                {
                  display_name: '张三',
                  id: 'member-1',
                  joined_at: '2026-09-18T09:00:00+08:00',
                  status: 'active',
                  user_id: 'user-1',
                  username: 'zhangsan',
                },
              ]
            : [
                {
                  display_name: '李四',
                  id: 'member-2',
                  joined_at: '2026-09-18T09:10:00+08:00',
                  status: 'disabled',
                  user_id: 'user-2',
                  username: 'lisi',
                },
              ],
        page,
        page_size: 200,
        total: 2,
      });
    });

    await expect(
      loadDepartmentMemberAssignment('department-1', signal),
    ).resolves.toMatchObject({
      assigned: [{ membership_id: 'member-1' }],
      candidates: [{ id: 'member-1' }, { id: 'member-2' }],
    });
    expect(api.post).toHaveBeenCalledTimes(3);
    expect(
      api.post.mock.calls.every((call) => call[2]?.signal === signal),
    ).toBe(true);
    expect(api.post).toHaveBeenCalledWith(
      '/tenant-departments/members/get',
      { id: 'department-1' },
      { signal },
    );
  });

  it('rejects an unbounded candidate set before loading more pages', async () => {
    api.post.mockImplementation((path) =>
      path === '/tenant-members/page'
        ? Promise.resolve({
            items: [],
            page: 1,
            page_size: 200,
            total: 1001,
          })
        : Promise.resolve([]),
    );
    await expect(
      loadDepartmentMemberAssignment('department-1'),
    ).rejects.toThrow('租户成员超过 1000 人');
  });

  it('deduplicates selected members and maps exactly one primary member', async () => {
    api.post.mockResolvedValue({});
    await saveDepartmentMemberAssignment({
      departmentID: 'department-1',
      membershipIDs: ['member-1', 'member-2', 'member-1'],
      primaryMembershipID: 'member-2',
    });
    expect(api.post).toHaveBeenCalledWith('/tenant-departments/members/set', {
      department_id: 'department-1',
      members: [
        { is_primary: false, membership_id: 'member-1' },
        { is_primary: true, membership_id: 'member-2' },
      ],
    });
  });

  it('rejects a primary member outside the selected set', async () => {
    await expect(
      saveDepartmentMemberAssignment({
        departmentID: 'department-1',
        membershipIDs: ['member-1'],
        primaryMembershipID: 'member-2',
      }),
    ).rejects.toThrow('主部门成员必须包含在已选择成员中');
    expect(api.post).not.toHaveBeenCalled();
  });
});
