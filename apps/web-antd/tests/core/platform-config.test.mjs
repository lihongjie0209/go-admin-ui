import { beforeEach, expect, it, vi } from 'vitest';

import {
  getPublicPlatformConfig,
  loadPublicPlatformConfig,
  publicPlatformConfig,
} from '../../src/api/core/platform-config';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('#/api/request', () => ({ publicRequestClient: api }));

function resetConfig(value = {}) {
  for (const key of Object.keys(publicPlatformConfig)) {
    Reflect.deleteProperty(publicPlatformConfig, key);
  }
  Object.assign(publicPlatformConfig, value);
  localStorage.clear();
}

beforeEach(() => {
  api.post.mockReset();
  resetConfig();
});

it('replaces the public configuration with the authoritative server snapshot', async () => {
  resetConfig({
    'platform.logo_url': '/stale-logo.svg',
    'platform.name': '旧名称',
  });
  api.post.mockResolvedValue([{ key: 'platform.name', value: '新平台' }]);

  await loadPublicPlatformConfig();

  expect(api.post).toHaveBeenCalledWith(
    '/public/platform-configs/list',
    { category: '' },
    { signal: expect.any(AbortSignal) },
  );
  expect({ ...publicPlatformConfig }).toEqual({ 'platform.name': '新平台' });
  expect(
    JSON.parse(localStorage.getItem('go-admin.public-platform-config')),
  ).toEqual({ 'platform.name': '新平台' });
});

it('retains the last known snapshot when the public endpoint is unavailable', async () => {
  resetConfig({ 'platform.name': '离线可用名称' });
  api.post.mockRejectedValue(new Error('offline'));

  await expect(loadPublicPlatformConfig()).resolves.toBe(publicPlatformConfig);
  expect(publicPlatformConfig['platform.name']).toBe('离线可用名称');
});

it('loads one public key and updates the shared cache', async () => {
  const signal = new AbortController().signal;
  api.post.mockResolvedValue({
    key: 'platform.public_url',
    value: 'https://example.test',
  });

  await expect(
    getPublicPlatformConfig('platform.public_url', signal),
  ).resolves.toBe('https://example.test');
  expect(api.post).toHaveBeenCalledWith(
    '/public/platform-configs/get',
    { key: 'platform.public_url' },
    { signal },
  );
  expect(publicPlatformConfig['platform.public_url']).toBe(
    'https://example.test',
  );
});
