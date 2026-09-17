import { clearPersistedTenantContext } from '#/api/go/tenant-context-storage';
import {
  clearPasswordChangeRequired,
  clearRefreshToken,
  getRefreshToken,
  setPasswordChangeRequired,
  setRefreshToken,
} from '#/api/go/token-vault';
import { publicRequestClient } from '#/api/request';

export namespace AuthApi {
  export interface LoginParams {
    password?: string;
    username?: string;
  }
  export interface LoginResult {
    accessToken: string;
    mustChangePassword: boolean;
  }
  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

interface TokenResult {
  access_token: string;
  expires_in: number;
  must_change_password: boolean;
  refresh_token: string;
  session_id: string;
  token_type: string;
}

export async function loginApi(data: AuthApi.LoginParams) {
  const tokens = await publicRequestClient.post<TokenResult>(
    '/auth/user/login',
    {
      password: data.password ?? '',
      username: data.username ?? '',
    },
  );
  setRefreshToken(tokens.refresh_token);
  setPasswordChangeRequired(tokens.must_change_password);
  return {
    accessToken: tokens.access_token,
    mustChangePassword: tokens.must_change_password,
  } satisfies AuthApi.LoginResult;
}

export async function refreshTokenApi() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('登录会话已失效');
  const tokens = await publicRequestClient.post<TokenResult>('/auth/refresh', {
    refresh_token: refreshToken,
  });
  // Logout or a newer login may happen while the refresh request is in
  // flight. Never let an obsolete response resurrect or overwrite that
  // session.
  if (getRefreshToken() !== refreshToken) {
    throw new Error('登录会话已变更');
  }
  setRefreshToken(tokens.refresh_token);
  setPasswordChangeRequired(tokens.must_change_password);
  return {
    data: tokens.access_token,
    status: 200,
  } satisfies AuthApi.RefreshTokenResult;
}

export async function logoutApi() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken)
      await publicRequestClient.post('/auth/logout', {
        refresh_token: refreshToken,
      });
  } finally {
    clearPasswordChangeRequired();
    clearRefreshToken();
    clearPersistedTenantContext();
  }
}
