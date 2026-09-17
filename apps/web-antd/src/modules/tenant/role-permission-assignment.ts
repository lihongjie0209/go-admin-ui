import { requestClient } from '#/api/request';

export interface TenantRoleReference {
  id: string;
  version: number;
}

interface PermissionView {
  action: string;
  id: string;
  name: string;
  permission_key: string;
  resource: string;
}

export interface RolePermissionSelection {
  items: Array<{
    description: string;
    id: string;
    name: string;
  }>;
  selected: string[];
}

export async function loadRolePermissionAssignment(
  roleID: string,
  signal?: AbortSignal,
): Promise<RolePermissionSelection> {
  const [available, assigned] = await Promise.all([
    requestClient.post<PermissionView[]>(
      '/tenant-authorization/assignable-permissions',
      {},
      { signal },
    ),
    requestClient.post<PermissionView[]>(
      '/tenant-roles/permissions/get',
      { id: roleID },
      { signal },
    ),
  ]);

  return {
    items: available.map((permission) => ({
      description: `${permission.permission_key} · ${permission.resource}:${permission.action}`,
      id: permission.id,
      name: permission.name,
    })),
    selected: assigned.map((permission) => permission.id),
  };
}

export async function saveRolePermissionAssignment(
  role: TenantRoleReference,
  permissionIDs: string[],
): Promise<void> {
  await requestClient.post('/tenant-roles/permissions/set', {
    permission_ids: permissionIDs,
    role_id: role.id,
    version: role.version,
  });
}
