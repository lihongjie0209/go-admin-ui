import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loginApi } from './auth';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  setPasswordChangeRequired: vi.fn(),
  setRefreshToken: vi.fn(),
}));

vi.mock('#/api/request', () => ({
  publicRequestClient: { post: mocks.post },
}));
vi.mock('#/api/go/tenant-context-storage', () => ({
  clearPersistedTenantContext: vi.fn(),
}));
vi.mock('#/api/go/token-vault', () => ({
  clearPasswordChangeRequired: vi.fn(),
  clearRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setPasswordChangeRequired: mocks.setPasswordChangeRequired,
  setRefreshToken: mocks.setRefreshToken,
}));

describe('loginApi', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.setPasswordChangeRequired.mockReset();
    mocks.setRefreshToken.mockReset();
  });

  it('propagates the forced password change state and stores the refresh token', async () => {
    mocks.post.mockResolvedValue({
      access_token: 'access-token',
      expires_in: 900,
      must_change_password: true,
      refresh_token: 'refresh-token',
      session_id: 'session-1',
      token_type: 'Bearer',
    });

    await expect(
      loginApi({ password: 'temporary-password', username: 'alice' }),
    ).resolves.toEqual({
      accessToken: 'access-token',
      mustChangePassword: true,
    });
    expect(mocks.post).toHaveBeenCalledExactlyOnceWith('/auth/user/login', {
      password: 'temporary-password',
      username: 'alice',
    });
    expect(mocks.setRefreshToken).toHaveBeenCalledExactlyOnceWith(
      'refresh-token',
    );
    expect(mocks.setPasswordChangeRequired).toHaveBeenCalledExactlyOnceWith(
      true,
    );
  });
});
