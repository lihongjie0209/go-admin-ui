import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  invalidateDictionaryCache,
  loadDictionaryItems,
} from '../../src/api/go/dictionary-cache';

const api = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../../src/api/go/dictionary', () => ({
  queryAllDictionaryOptions: api.query,
}));

beforeEach(() => {
  api.query.mockReset();
  invalidateDictionaryCache();
});

describe('dictionary request cache', () => {
  it('deduplicates concurrent equivalent requests with canonically ordered parameters', async () => {
    api.query.mockResolvedValue({
      items: [{ id: 'active', label: '启用', value: 'active' }],
    });
    const first = loadDictionaryItems('identity.user-status', {
      filter: { b: 2, a: 1 },
      tenant: 't1',
    });
    const second = loadDictionaryItems('identity.user-status', {
      tenant: 't1',
      filter: { a: 1, b: 2 },
    });
    expect(first).toBe(second);
    await expect(first).resolves.toHaveLength(1);
    expect(api.query).toHaveBeenCalledTimes(1);
  });

  it('evicts a rejected request so a later retry can recover', async () => {
    api.query
      .mockRejectedValueOnce(new Error('temporary unavailable'))
      .mockResolvedValueOnce({ items: [] });
    await expect(loadDictionaryItems('identity.user-status')).rejects.toThrow(
      'temporary unavailable',
    );
    await expect(loadDictionaryItems('identity.user-status')).resolves.toEqual(
      [],
    );
    expect(api.query).toHaveBeenCalledTimes(2);
  });

  it('invalidates only the requested dictionary namespace', async () => {
    api.query.mockResolvedValue({ items: [] });
    await loadDictionaryItems('identity.user-status');
    await loadDictionaryItems('tenant.department');
    invalidateDictionaryCache('identity.user-status');
    await loadDictionaryItems('identity.user-status');
    await loadDictionaryItems('tenant.department');
    expect(api.query).toHaveBeenCalledTimes(3);
  });
});
