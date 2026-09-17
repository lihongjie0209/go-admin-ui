import { describe, expect, it } from 'vitest';

import { toPageRequest } from '../../src/api/go/resource';
import {
  clearPasswordChangeRequired,
  clearRefreshToken,
  getRefreshToken,
  isPasswordChangeRequired,
  setPasswordChangeRequired,
  setRefreshToken,
} from '../../src/api/go/token-vault';
import { forcedPasswordRoute } from '../../src/router/guard';

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

  it('persists forced-password state and redirects business routes', () => {
    setPasswordChangeRequired(true);
    expect(isPasswordChangeRequired()).toBe(true);
    expect(forcedPasswordRoute('/app/platform/users', true, true)).toEqual({
      path: '/auth/change-password',
      replace: true,
    });
    expect(forcedPasswordRoute('/auth/change-password', true, true)).toBe(
      undefined,
    );
    expect(forcedPasswordRoute('/app/platform/users', false, true)).toBe(
      undefined,
    );
    clearPasswordChangeRequired();
    expect(isPasswordChangeRequired()).toBe(false);
  });
});
