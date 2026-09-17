/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';
import { normalizeApiError } from './go/api-error';
import { API_CODE_OK } from './go/contracts';
import { restorePersistedTenantContext } from './go/tenant-context-storage';
import { applyRequestContentType } from './request-content-type';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(
  baseURL: string,
  options?: RequestClientOptions,
  authenticated = true,
) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const resp = await refreshTokenApi();
    const newToken = resp.data;
    accessStore.setAccessToken(newToken);
    const scopedToken = await restorePersistedTenantContext((tenantID) =>
      client.post('/tenant-context/switch', { tenant_id: tenantID }),
    );
    if (!scopedToken) return newToken;
    accessStore.setAccessToken(scopedToken);
    return scopedToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      if (authenticated) {
        config.headers.Authorization = formatToken(accessStore.accessToken);
      }
      config.headers['Accept-Language'] = preferences.app.locale;
      // The browser must add the multipart boundary. A manually supplied
      // content type produces an invalid upload body.
      applyRequestContentType(config.headers, config.data);
      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'body',
      successCode: API_CODE_OK,
    }),
  );

  // token过期的处理
  if (authenticated) {
    client.addResponseInterceptor(
      authenticateResponseInterceptor({
        client,
        doReAuthenticate,
        doRefreshToken,
        enableRefreshToken: preferences.app.enableRefreshToken,
        formatToken,
      }),
    );
  }

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      // 当前mock接口返回的错误字段是 error 或者 message
      const responseData = error?.response?.data ?? {};
      const requestID = responseData?.request_id
        ? `（请求 ID：${responseData.request_id}）`
        : '';
      const errorMessage = responseData?.message ?? responseData?.error ?? '';
      // 如果没有错误信息，则会根据状态码进行提示
      message.error(`${errorMessage || msg}${requestID}`);
    }),
  );

  client.addResponseInterceptor({
    rejected: (error) => Promise.reject(normalizeApiError(error)),
  });

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

// Credential exchange must never inherit a stale access token or recursively
// trigger the access-token refresh interceptor.
export const publicRequestClient = createRequestClient(
  apiURL,
  { responseReturn: 'data' },
  false,
);

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
