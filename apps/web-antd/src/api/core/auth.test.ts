import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loginApi, refreshTokenApi } from './auth';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  getRefreshToken: vi.fn(),
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
  getRefreshToken: mocks.getRefreshToken,
  setPasswordChangeRequired: mocks.setPasswordChangeRequired,
  setRefreshToken: mocks.setRefreshToken,
}));

describe('loginApi', () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.getRefreshToken.mockReset();
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

  it('rotates refresh credentials only while the same session is active', async () => {
    mocks.getRefreshToken.mockReturnValue('current-refresh-token');
    mocks.post.mockResolvedValue({
      access_token: 'new-access-token',
      expires_in: 900,
      must_change_password: false,
      refresh_token: 'rotated-refresh-token',
      session_id: 'session-1',
      token_type: 'Bearer',
    });

    await expect(refreshTokenApi()).resolves.toEqual({
      data: 'new-access-token',
      status: 200,
    });
    expect(mocks.setRefreshToken).toHaveBeenCalledExactlyOnceWith(
      'rotated-refresh-token',
    );
  });

  it('discards a refresh response after logout or another login', async () => {
    mocks.getRefreshToken
      .mockReturnValueOnce('old-refresh-token')
      .mockReturnValueOnce('different-or-cleared-token');
    mocks.post.mockResolvedValue({
      access_token: 'obsolete-access-token',
      expires_in: 900,
      must_change_password: false,
      refresh_token: 'obsolete-refresh-token',
      session_id: 'old-session',
      token_type: 'Bearer',
    });

    await expect(refreshTokenApi()).rejects.toThrow('登录会话已变更');
    expect(mocks.setRefreshToken).not.toHaveBeenCalled();
    expect(mocks.setPasswordChangeRequired).not.toHaveBeenCalled();
  });
});
