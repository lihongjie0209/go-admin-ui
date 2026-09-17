import { requestClient } from '#/api/request';

export interface DepartmentMemberView {
  display_name: string;
  is_primary: boolean;
  joined_at: string;
  membership_id: string;
  status: 'active' | 'disabled';
  user_id: string;
  username: string;
}

export interface TenantMemberCandidate {
  display_name: string;
  id: string;
  joined_at: string;
  status: 'active' | 'disabled';
  user_id: string;
  username: string;
}

interface TenantMemberPage {
  items: TenantMemberCandidate[];
  page: number;
  page_size: number;
  total: number;
}

const PAGE_SIZE = 200;
const MAX_MEMBERS = 1000;

async function loadCandidates(signal?: AbortSignal) {
  const items: TenantMemberCandidate[] = [];
  for (let page = 1; ; page += 1) {
    const result = await requestClient.post<TenantMemberPage>(
      '/tenant-members/page',
      {
        keyword: '',
        page,
        page_size: PAGE_SIZE,
        sort: [
          { direction: 'asc', field: 'username' },
          { direction: 'asc', field: 'id' },
        ],
        statuses: ['active', 'disabled'],
      },
      { signal },
    );
    if (result.total > MAX_MEMBERS) {
      throw new Error(`租户成员超过 ${MAX_MEMBERS} 人，请先缩小可分配范围`);
    }
    items.push(...result.items);
    if (items.length >= result.total || result.items.length === 0) return items;
  }
}

export async function loadDepartmentMemberAssignment(
  departmentID: string,
  signal?: AbortSignal,
) {
  const [candidates, assigned] = await Promise.all([
    loadCandidates(signal),
    requestClient.post<DepartmentMemberView[]>(
      '/tenant-departments/members/get',
      { id: departmentID },
      { signal },
    ),
  ]);
  return { assigned, candidates };
}

export async function saveDepartmentMemberAssignment(input: {
  departmentID: string;
  membershipIDs: string[];
  primaryMembershipID?: string;
}) {
  const membershipIDs = [...new Set(input.membershipIDs)];
  if (membershipIDs.length > MAX_MEMBERS) {
    throw new Error(`单个部门最多分配 ${MAX_MEMBERS} 名成员`);
  }
  if (
    input.primaryMembershipID &&
    !membershipIDs.includes(input.primaryMembershipID)
  ) {
    throw new Error('主部门成员必须包含在已选择成员中');
  }
  await requestClient.post('/tenant-departments/members/set', {
    department_id: input.departmentID,
    members: membershipIDs.map((membershipID) => ({
      is_primary: membershipID === input.primaryMembershipID,
      membership_id: membershipID,
    })),
  });
}
