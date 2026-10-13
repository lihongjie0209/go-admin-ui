import { beforeEach, expect, it, vi } from 'vitest';

import { loadScopedPermissionActionOptions } from '../../src/modules/platform/authorization-options';

const catalog = vi.hoisted(() => ({
  pageCatalogActions: vi.fn(),
  pageCatalogResources: vi.fn(),
}));
vi.mock('#/api/go', () => catalog);
vi.mock('#/api/request', () => ({ requestClient: { post: vi.fn() } }));

beforeEach(() => {
  catalog.pageCatalogActions.mockReset();
  catalog.pageCatalogResources.mockReset();
  catalog.pageCatalogResources.mockResolvedValue({
    items: [
      {
        id: 'r1',
        resource_key: 'permission.definition',
        name: '权限',
        scope: 'platform',
      },
      {
        id: 'r2',
        resource_key: 'identity.user',
        name: '用户',
        scope: 'platform',
      },
      {
        id: 'r3',
        resource_key: 'tenant.member',
        name: '成员',
        scope: 'tenant',
      },
    ],
    total: 3,
  });
  catalog.pageCatalogActions.mockResolvedValue({
    items: [
      {
        id: 'a1',
        resource_id: 'r1',
        resource_key: 'permission.definition',
        action_key: 'read',
        name: '读取',
      },
      {
        id: 'a2',
        resource_id: 'r2',
        resource_key: 'identity.user',
        action_key: 'update',
        name: '更新',
      },
      {
        id: 'a3',
        resource_id: 'r3',
        resource_key: 'tenant.member',
        action_key: 'read',
        name: '读取',
      },
    ],
    total: 3,
  });
});

it('offers active actions in the permission resource scope only', async () => {
  const signal = new AbortController().signal;
  const options = await loadScopedPermissionActionOptions(
    'permission.definition',
    signal,
  );
  expect(options).toEqual([
    { label: 'permission.definition:read · 读取', value: 'a1' },
    { label: 'identity.user:update · 更新', value: 'a2' },
  ]);
  expect(catalog.pageCatalogActions).toHaveBeenCalledWith(
    { page: 1, page_size: 200, statuses: ['active'] },
    signal,
  );
});

it('fails closed when the primary resource is not active', async () => {
  await expect(
    loadScopedPermissionActionOptions(
      'missing.resource',
      new AbortController().signal,
    ),
  ).rejects.toThrow('未注册或已停用');
  expect(catalog.pageCatalogActions).not.toHaveBeenCalled();
});
