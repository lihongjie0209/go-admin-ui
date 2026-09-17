import { reactive } from 'vue';

import { requestClient } from '#/api/request';

export interface PublicPlatformConfig {
  'platform.logo_url'?: string;
  'platform.name'?: string;
  'platform.public_url'?: string;
  [key: string]: unknown;
}

export const publicPlatformConfig = reactive<PublicPlatformConfig>({});
const publicConfigCacheKey = 'go-admin.public-platform-config';

function isConfigSnapshot(value: unknown): value is PublicPlatformConfig {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function replacePublicPlatformConfig(next: PublicPlatformConfig) {
  for (const key of Object.keys(publicPlatformConfig)) {
    Reflect.deleteProperty(publicPlatformConfig, key);
  }
  Object.assign(publicPlatformConfig, next);
}

function persistPublicPlatformConfig() {
  localStorage.setItem(
    publicConfigCacheKey,
    JSON.stringify(publicPlatformConfig),
  );
}

try {
  const cached: unknown = JSON.parse(
    localStorage.getItem(publicConfigCacheKey) || '{}',
  );
  if (isConfigSnapshot(cached)) replacePublicPlatformConfig(cached);
  else localStorage.removeItem(publicConfigCacheKey);
} catch {
  localStorage.removeItem(publicConfigCacheKey);
}

export async function loadPublicPlatformConfig() {
  try {
    const records = await requestClient.post<
      Array<{ key: string; value: unknown }>
    >(
      '/public/platform-configs/list',
      { category: '' },
      { signal: AbortSignal.timeout(1500) },
    );
    const data = Object.fromEntries(
      records.map((record) => [record.key, record.value]),
    ) as PublicPlatformConfig;
    replacePublicPlatformConfig(data);
    persistPublicPlatformConfig();
  } catch {
    // 公共配置不可用时保留构建期默认值，不能阻断登录页。
  }
  return publicPlatformConfig;
}

export async function getPublicPlatformConfig(
  key: string,
  signal?: AbortSignal,
) {
  const record = await requestClient.post<{ key: string; value: unknown }>(
    '/public/platform-configs/get',
    { key },
    { signal },
  );
  publicPlatformConfig[record.key] = record.value;
  persistPublicPlatformConfig();
  return record.value;
}
