import { clearPersistedTenantContext } from '#/api/go/tenant-context-storage';
import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from '#/api/go/token-vault';
import { requestClient } from '#/api/request';

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
  refresh_token: string;
  session_id: string;
  token_type: string;
}

export async function loginApi(data: AuthApi.LoginParams) {
  const tokens = await requestClient.post<TokenResult>('/auth/user/login', {
    password: data.password ?? '',
    username: data.username ?? '',
  });
  setRefreshToken(tokens.refresh_token);
  return {
    accessToken: tokens.access_token,
    mustChangePassword: false,
  } satisfies AuthApi.LoginResult;
}

export async function refreshTokenApi() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('登录会话已失效');
  const tokens = await requestClient.post<TokenResult>('/auth/refresh', {
    refresh_token: refreshToken,
  });
  setRefreshToken(tokens.refresh_token);
  return {
    data: tokens.access_token,
    status: 200,
  } satisfies AuthApi.RefreshTokenResult;
}

export async function logoutApi() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken)
      await requestClient.post('/auth/logout', { refresh_token: refreshToken });
  } finally {
    clearRefreshToken();
    clearPersistedTenantContext();
  }
}

// Concrete modules register Resource/Action capability requests when added.
export async function getAccessCodesApi() {
  return [] as string[];
}
