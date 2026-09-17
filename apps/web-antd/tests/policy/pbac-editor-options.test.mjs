import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const {
  invalidatePBACEditorOptions,
  loadPBACActionOptions,
  loadPBACResourceOptions,
} = await import('../../src/modules/policy/pbac-editor-options.ts');

const definitions = [
  {
    actions: [
      { key: 'read', name: '读取' },
      { key: 'update', name: '更新' },
    ],
    key: 'tenant.member',
    name: '租户成员',
    scope: 'tenant',
  },
];

beforeEach(() => {
  api.post.mockReset();
  invalidatePBACEditorOptions();
});

describe('pBAC editor options', () => {
  it('loads registered resources and reuses the bounded catalog cache', async () => {
    api.post.mockResolvedValue(definitions);
    const signal = new AbortController().signal;

    await expect(loadPBACResourceOptions({}, signal)).resolves.toEqual([
      { label: '租户成员（tenant.member）', value: 'tenant.member' },
    ]);
    await expect(
      loadPBACActionOptions({ resource: 'tenant.member' }, signal),
    ).resolves.toEqual([
      { label: '读取（read）', value: 'read' },
      { label: '更新（update）', value: 'update' },
    ]);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('does not request the catalog before a resource is selected', async () => {
    await expect(
      loadPBACActionOptions({ resource: '' }, new AbortController().signal),
    ).resolves.toEqual([]);
    expect(api.post).not.toHaveBeenCalled();
  });
});
