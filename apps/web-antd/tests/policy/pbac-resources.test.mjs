import { beforeEach, expect, it, vi } from 'vitest';

import {
  filterPBACResources,
  listPBACResources,
} from '../../src/api/go/pbac-resources';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const definitions = [
  {
    actions: [
      { description: '读取成员详情', key: 'read', name: '读取' },
      { key: 'update', name: '更新' },
    ],
    description: '租户成员资料',
    key: 'tenant.member',
    name: '租户成员',
    scope: 'tenant',
  },
  {
    actions: [{ key: 'list', name: '列表' }],
    key: 'application',
    name: '应用',
    scope: 'platform',
  },
];

beforeEach(() => {
  api.post.mockReset();
});

it('按范围读取注册表并向请求层传递取消信号', async () => {
  api.post.mockResolvedValue(definitions);
  const signal = new AbortController().signal;
  await expect(listPBACResources('tenant', signal)).resolves.toBe(definitions);
  expect(api.post).toHaveBeenCalledWith(
    '/pbac/resources/list',
    { scope: 'tenant' },
    { signal },
  );
});

it('可按资源、动作及中文说明检索且不改变原始顺序', () => {
  expect(filterPBACResources(definitions, 'member')).toEqual([definitions[0]]);
  expect(filterPBACResources(definitions, '读取成员')).toEqual([
    definitions[0],
  ]);
  expect(filterPBACResources(definitions, '列表')).toEqual([definitions[1]]);
  expect(filterPBACResources(definitions, '  ')).toBe(definitions);
  expect(filterPBACResources(definitions, '不存在')).toEqual([]);
});
