import { beforeEach, expect, it, vi } from 'vitest';

import {
  findTenantApplicationGrant,
  getTenantApplicationGrant,
  grantTenantApplication,
  grantVersion,
  listActiveApplications,
  pageTenantApplicationGrants,
  revokeTenantApplication,
} from '../../src/modules/platform/tenant-application-grants';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const grant = {
  application_code: 'console',
  application_id: 'application-1',
  application_name: '管理台',
  id: 'grant-1',
  status: 'revoked',
  tenant_id: 'tenant-1',
  tenant_name: '租户一',
  version: 4,
};

beforeEach(() => {
  api.post.mockReset();
});

it('分页请求强制携带租户边界并支持取消', async () => {
  api.post.mockResolvedValue({ items: [], page: 1, page_size: 20, total: 0 });
  const signal = new AbortController().signal;
  const request = { page: 1, page_size: 20, tenant_id: 'tenant-1' };
  await pageTenantApplicationGrants(request, signal);
  expect(api.post).toHaveBeenCalledWith(
    '/platform/tenant-applications/page',
    request,
    { signal },
  );
});

it('详情请求同时携带租户和授权记录边界并支持取消', async () => {
  api.post.mockResolvedValue(grant);
  const signal = new AbortController().signal;
  await expect(
    getTenantApplicationGrant('tenant-1', 'grant-1', signal),
  ).resolves.toBe(grant);
  expect(api.post).toHaveBeenCalledWith(
    '/platform/tenant-applications/get',
    { id: 'grant-1', tenant_id: 'tenant-1' },
    { signal },
  );
});

it('只加载启用应用作为授权候选', async () => {
  const signal = new AbortController().signal;
  api.post.mockResolvedValue({ items: [{ id: 'application-1' }] });
  await expect(listActiveApplications(signal)).resolves.toEqual([
    { id: 'application-1' },
  ]);
  expect(api.post).toHaveBeenCalledWith(
    '/applications/page',
    {
      page: 1,
      page_size: 200,
      sort: [{ direction: 'asc', field: 'name' }],
      statuses: ['active'],
    },
    { signal },
  );
});

it('新授权使用版本零，重新授权使用现有记录版本', () => {
  expect(grantVersion([], 'application-1')).toBe(0);
  expect(grantVersion([grant], 'application-1')).toBe(4);
});

it('保存前按租户和应用精确查询现有授权，避免分页遗漏乐观锁版本', async () => {
  api.post.mockResolvedValue({
    items: [grant],
    page: 1,
    page_size: 1,
    total: 1,
  });
  await expect(
    findTenantApplicationGrant('tenant-1', 'application-1'),
  ).resolves.toBe(grant);
  expect(api.post).toHaveBeenCalledWith(
    '/platform/tenant-applications/page',
    {
      application_ids: ['application-1'],
      page: 1,
      page_size: 1,
      statuses: [],
      tenant_id: 'tenant-1',
    },
    { signal: undefined },
  );
});

it('授权和撤销请求包含租户、授权记录及乐观锁版本', async () => {
  api.post.mockResolvedValue({});
  const input = {
    application_id: 'application-1',
    expires_at: null,
    starts_at: null,
    tenant_id: 'tenant-1',
    version: 4,
  };
  await grantTenantApplication(input);
  expect(api.post).toHaveBeenNthCalledWith(
    1,
    '/platform/tenant-applications/grant',
    input,
  );
  await revokeTenantApplication(grant);
  expect(api.post).toHaveBeenNthCalledWith(
    2,
    '/platform/tenant-applications/revoke',
    { id: 'grant-1', tenant_id: 'tenant-1', version: 4 },
  );
});
