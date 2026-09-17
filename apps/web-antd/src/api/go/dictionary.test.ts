import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryDictionary } from './dictionary';

const clients = vi.hoisted(() => ({
  authenticatedPost: vi.fn(),
  publicPost: vi.fn(),
}));

vi.mock('#/api/request', () => ({
  publicRequestClient: { post: clients.publicPost },
  requestClient: { post: clients.authenticatedPost },
}));

describe('public dictionary query', () => {
  beforeEach(() => {
    clients.authenticatedPost.mockReset();
    clients.publicPost.mockReset();
  });

  it('uses the anonymous client and maps enum options', async () => {
    clients.publicPost.mockResolvedValueOnce({
      code: 'user-status',
      items: [
        {
          code: 'active',
          disabled: false,
          extension: { color: 'green' },
          id: 'item-1',
          name: '启用',
          parent_id: null,
          sort_order: 10,
          value: 'active',
        },
      ],
      name: '用户状态',
      page: 1,
      page_size: 50,
      total: 1,
      type: 'enum',
    });

    await expect(
      queryDictionary({ dictionary_key: 'user-status' }),
    ).resolves.toMatchObject({
      dictionary_type: 'enum',
      has_more: false,
      items: [
        {
          code: 'active',
          extension: { color: 'green' },
          label: '启用',
          value: 'active',
        },
      ],
    });
    expect(clients.publicPost).toHaveBeenCalledExactlyOnceWith(
      '/public/dictionaries/query',
      expect.objectContaining({
        code: 'user-status',
        include_disabled: false,
        keyword: '',
        page: 1,
        page_size: 50,
      }),
    );
    expect(clients.authenticatedPost).not.toHaveBeenCalled();
  });

  it('flattens tree results and filters requested values', async () => {
    clients.publicPost.mockResolvedValueOnce({
      code: 'departments',
      items: [
        {
          children: [
            {
              code: 'research',
              disabled: false,
              id: 'department-2',
              name: '研发部',
              parent_id: 'department-1',
              sort_order: 10,
              value: 'research',
            },
          ],
          code: 'headquarters',
          disabled: false,
          id: 'department-1',
          name: '总部',
          parent_id: null,
          sort_order: 10,
          value: 'headquarters',
        },
      ],
      name: '部门',
      page: 1,
      page_size: 50,
      total: 2,
      type: 'tree',
    });

    const result = await queryDictionary({
      dictionary_key: 'departments',
      values: ['research'],
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'department-2',
        label: '研发部',
        parent_id: 'department-1',
        value: 'research',
      }),
    ]);
  });
});
