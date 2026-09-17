import { requestClient } from '#/api/request';

interface PermissionTreeNode {
  action: string;
  children: PermissionTreeNode[];
  id: string;
  name: string;
  node_type: 'group' | 'permission';
  permission_key: string;
  resource: string;
  status: 'active' | 'disabled';
}

interface PermissionView {
  action: string;
  id: string;
  name: string;
  permission_key: string;
  resource: string;
}

export interface TenantReference {
  id: string;
  name: string;
  version: number;
}

export interface AdministratorCandidate {
  display_name: string;
  is_administrator: boolean;
  joined_at: string;
  membership_id: string;
  status: 'active' | 'disabled';
  tenant_id: string;
  user_id: string;
  username: string;
  version: number;
}

export interface AdministratorCandidatePage {
  items: AdministratorCandidate[];
  page: number;
  page_size: number;
  total: number;
}

export type TenantAdministratorScope = 'platform' | 'tenant';

function flattenPermissions(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenPermissions(node.children ?? []),
  ]);
}

export async function loadTenantPermissionCeiling(
  tenantID: string,
  signal?: AbortSignal,
) {
  const [tree, selected] = await Promise.all([
    requestClient.post<PermissionTreeNode[]>(
      '/permissions/tree',
      {
        keyword: '',
        node_types: ['group', 'permission'],
        statuses: ['active'],
      },
      { signal },
    ),
    requestClient.post<PermissionView[]>(
      '/platform/tenant-authorization/permissions/get',
      { tenant_id: tenantID },
      { signal },
    ),
  ]);
  return {
    items: flattenPermissions(tree)
      .filter((permission) => permission.node_type === 'permission')
      .map((permission) => ({
        description: `${permission.permission_key} · ${permission.resource}:${permission.action}`,
        id: permission.id,
        name: permission.name,
      })),
    selected: selected.map((permission) => permission.id),
  };
}

export async function saveTenantPermissionCeiling(
  tenant: TenantReference,
  permissionIDs: string[],
) {
  await requestClient.post('/platform/tenant-authorization/permissions/set', {
    permission_ids: permissionIDs,
    tenant_id: tenant.id,
    version: tenant.version,
  });
}

export function pageAdministratorCandidates(
  request: Record<string, unknown>,
  signal?: AbortSignal,
  scope: TenantAdministratorScope = 'platform',
) {
  return requestClient.post<AdministratorCandidatePage>(
    scope === 'platform'
      ? '/platform/tenant-authorization/administrators/page'
      : '/tenant-authorization/administrators/page',
    request,
    { signal },
  );
}

export async function setTenantAdministrator(
  input: {
    enabled: boolean;
    membership_id: string;
    tenant_id: string;
  },
  scope: TenantAdministratorScope = 'platform',
) {
  await requestClient.post(
    scope === 'platform'
      ? '/platform/tenant-authorization/administrators/set'
      : '/tenant-authorization/administrators/set',
    input,
  );
}
