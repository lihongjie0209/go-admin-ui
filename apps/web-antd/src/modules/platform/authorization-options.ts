import type {
  CatalogAction,
  CatalogResource,
  PermissionAction,
} from '#/api/go';

import { pageCatalogActions, pageCatalogResources } from '#/api/go';
import { requestClient } from '#/api/request';

const pageSize = 200;
const maxOptions = 10_000;

async function collect<T>(
  load: (page: number) => Promise<{ items: T[]; total: number }>,
  signal: AbortSignal,
) {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    const result = await load(page);
    if (result.total > maxOptions)
      throw new Error('候选项超过 10000 项，请缩小资源范围');
    items.push(...result.items);
    if (items.length >= result.total || result.items.length === 0) return items;
  }
}

export function loadCatalogResources(signal: AbortSignal) {
  return collect<CatalogResource>(
    (page) =>
      pageCatalogResources(
        { page, page_size: pageSize, statuses: ['active'] },
        signal,
      ),
    signal,
  );
}

export function loadCatalogActions(resourceID: string, signal: AbortSignal) {
  return collect<CatalogAction>(
    (page) =>
      pageCatalogActions(
        {
          page,
          page_size: pageSize,
          ...(resourceID ? { resource_id: resourceID } : {}),
          statuses: ['active'],
        },
        signal,
      ),
    signal,
  );
}

export async function loadCatalogResourceOptions(
  _values: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) {
  const resources = await loadCatalogResources(signal);
  return resources.map((item) => ({
    label: `${item.resource_key} · ${item.name}`,
    value: item.resource_key,
  }));
}

export async function loadCatalogResourceIDOptions(
  _values: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) {
  const resources = await loadCatalogResources(signal);
  return resources.map((item) => ({
    label: `${item.resource_key} · ${item.name}`,
    value: item.id,
  }));
}

export async function loadCatalogActionOptions(
  values: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) {
  const key = String(values.resource ?? '');
  if (!key) return [];
  const resources = await loadCatalogResources(signal);
  const resource = resources.find((item) => item.resource_key === key);
  if (!resource) return [];
  const actions = await loadCatalogActions(resource.id, signal);
  return actions.map((item) => ({
    label: `${item.action_key} · ${item.name}`,
    value: item.action_key,
  }));
}

interface PermissionNode {
  children?: PermissionNode[];
  id: string;
  name: string;
  node_type: string;
  permission_key: string;
  resource: string;
  status: string;
}

function flattenPermissions(nodes: PermissionNode[]): PermissionNode[] {
  return nodes.flatMap((node) => [
    node,
    ...flattenPermissions(node.children ?? []),
  ]);
}

export async function loadPlatformPermissionOptions(
  _values: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) {
  const tree = await requestClient.post<PermissionNode[]>(
    '/permissions/tree',
    {},
    { signal },
  );
  const resources = await loadCatalogResources(signal);
  const platform = new Set(
    resources
      .filter((resource) => resource.scope === 'platform')
      .map((resource) => resource.resource_key),
  );
  return flattenPermissions(tree)
    .filter(
      (node) =>
        node.node_type === 'permission' &&
        node.status === 'active' &&
        platform.has(node.resource),
    )
    .map((node) => ({
      label: `${node.permission_key} · ${node.name}`,
      value: node.id,
    }));
}

export async function loadPrincipalOptions(
  values: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) {
  const type = String(values.principal_type ?? '');
  if (type !== 'user' && type !== 'service_account') return [];
  const path = type === 'user' ? '/users/page' : '/service-accounts/page';
  const rows = await collect<{
    client_id?: string;
    display_name?: string;
    id: string;
    name?: string;
    username?: string;
  }>(
    (page) =>
      requestClient.post(
        path,
        { page, page_size: pageSize, statuses: ['active'] },
        { signal },
      ),
    signal,
  );
  return rows.map((row) => ({
    label:
      type === 'user'
        ? `${row.display_name || row.username || row.id} (${row.username || row.id})`
        : `${row.name || row.id} (${row.client_id || row.id})`,
    value: row.id,
  }));
}

export function actionOption(action: PermissionAction) {
  return {
    label: `${action.resource_key}:${action.action_key} · ${action.action_name}`,
    value: action.id,
  };
}

export async function loadScopedPermissionActionOptions(
  primaryResourceKey: string,
  signal: AbortSignal,
) {
  const resources = await loadCatalogResources(signal);
  const primary = resources.find(
    (row) => row.resource_key === primaryResourceKey,
  );
  if (!primary) throw new Error('权限关联的资源未注册或已停用');
  const scoped = new Map(
    resources
      .filter((row) => row.scope === primary.scope)
      .map((row) => [row.id, row]),
  );
  const actions = await loadCatalogActions('', signal);
  return actions.flatMap((action) => {
    const resource = scoped.get(action.resource_id);
    return resource
      ? [
          actionOption({
            ...action,
            action_name: action.name,
            resource_name: resource.name,
            scope: resource.scope,
          }),
        ]
      : [];
  });
}
