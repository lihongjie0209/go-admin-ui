import { describe, expect, it } from 'vitest';

import { toPageRequest } from '../../src/api/go/resource';
import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from '../../src/api/go/token-vault';

describe('go API infrastructure contract', () => {
  it('maps the existing table query into the shared page contract', () => {
    expect(
      toPageRequest(
        {
          defaultSort: [{ field: 'created_at', direction: 'desc' }],
          mapFilters: (filters) => ({
            statuses: filters.status ? [filters.status] : [],
          }),
        },
        {
          filters: { status: 'active' },
          page: 2,
          page_size: 20,
        },
      ),
    ).toEqual({
      keyword: '',
      page: 2,
      page_size: 20,
      statuses: ['active'],
      sort: [{ field: 'created_at', direction: 'desc' }],
    });
  });

  it('keeps refresh credentials in session storage and clears them', () => {
    setRefreshToken('secret-refresh-token');
    expect(getRefreshToken()).toBe('secret-refresh-token');
    clearRefreshToken();
    expect(getRefreshToken()).toBe('');
  });
});
