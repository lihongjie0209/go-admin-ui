import { requestClient } from '#/api/request';

export interface MemberRoleAssignmentSubject {
  id: string;
  version: number;
}

interface RoleReference {
  code: string;
  id: string;
  name: string;
}

interface RolePage {
  items: RoleReference[];
}

interface AssignedRoleReference {
  id: string;
}

export async function loadMemberRoleAssignment(
  membershipID: string,
  signal?: AbortSignal,
) {
  const [rolePage, assigned] = await Promise.all([
    requestClient.post<RolePage>(
      '/tenant-roles/page',
      {
        keyword: '',
        page: 1,
        page_size: 200,
        statuses: ['active'],
      },
      { signal },
    ),
    requestClient.post<AssignedRoleReference[]>(
      '/tenant-members/roles/get',
      { membership_id: membershipID },
      { signal },
    ),
  ]);

  return {
    items: rolePage.items.map((role) => ({
      description: role.code,
      id: role.id,
      name: role.name,
    })),
    selected: assigned.map((role) => role.id),
  };
}

export async function saveMemberRoleAssignment(
  member: MemberRoleAssignmentSubject,
  roleIDs: string[],
) {
  await requestClient.post('/tenant-members/roles/set', {
    membership_id: member.id,
    role_ids: roleIDs,
    version: member.version,
  });
}
