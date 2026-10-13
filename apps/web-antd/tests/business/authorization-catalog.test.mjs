import { beforeEach, expect, it, vi } from 'vitest';

import {
  getPermissionActions,
  pageCatalogActions,
  pageCatalogResources,
  pagePlatformPermissionGrants,
  setPermissionActions,
} from '../../src/api/go/authorization-catalog';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: api }));

beforeEach(() => api.post.mockReset());

it('pages the resource/action catalog and platform grants with bounded filters', async () => {
  const signal = new AbortController().signal;
  await pageCatalogResources(
    { page: 2, page_size: 20, sources: ['manual'] },
    signal,
  );
  expect(api.post).toHaveBeenLastCalledWith(
    '/authorization/resources/page',
    { page: 2, page_size: 20, sources: ['manual'] },
    { signal },
  );
  await pageCatalogActions({ page: 1, resource_id: 'resource-id' }, signal);
  expect(api.post).toHaveBeenLastCalledWith(
    '/authorization/actions/page',
    { page: 1, resource_id: 'resource-id' },
    { signal },
  );
  await pagePlatformPermissionGrants({ principal_type: 'user' }, signal);
  expect(api.post).toHaveBeenLastCalledWith(
    '/platform/permission-grants/page',
    { principal_type: 'user' },
    { signal },
  );
});

it('loads and replaces permission actions with optimistic version', async () => {
  const signal = new AbortController().signal;
  await getPermissionActions('permission-id', signal);
  expect(api.post).toHaveBeenLastCalledWith(
    '/permissions/actions/get',
    { id: 'permission-id' },
    { signal },
  );
  await setPermissionActions('permission-id', 7, ['action-id']);
  expect(api.post).toHaveBeenLastCalledWith('/permissions/actions/set', {
    action_ids: ['action-id'],
    id: 'permission-id',
    version: 7,
  });
});
