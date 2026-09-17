import { beforeEach, describe, expect, it, vi } from 'vitest';

const clients = vi.hoisted(() => ({
  authenticatedPost: vi.fn(),
  publicPost: vi.fn(),
}));

vi.mock('#/api/request', () => ({
  publicRequestClient: { post: clients.publicPost },
  requestClient: { post: clients.authenticatedPost },
}));

describe('public platform configuration', () => {
  beforeEach(() => {
    clients.authenticatedPost.mockReset();
    clients.publicPost.mockReset();
    localStorage.clear();
    vi.resetModules();
  });

  it('loads the anonymous startup snapshot without the authenticated client', async () => {
    clients.publicPost.mockResolvedValueOnce([
      { key: 'platform.name', value: '统一平台' },
      { key: 'platform.public_url', value: 'https://platform.example.com' },
    ]);
    const { loadPublicPlatformConfig } = await import('./platform-config');

    await expect(loadPublicPlatformConfig()).resolves.toMatchObject({
      'platform.name': '统一平台',
      'platform.public_url': 'https://platform.example.com',
    });
    expect(clients.publicPost).toHaveBeenCalledExactlyOnceWith(
      '/public/platform-configs/list',
      { category: '' },
      { signal: expect.any(AbortSignal) },
    );
    expect(clients.authenticatedPost).not.toHaveBeenCalled();
  });

  it('reads one public value anonymously and updates the persisted snapshot', async () => {
    clients.publicPost.mockResolvedValueOnce({
      key: 'platform.name',
      value: '新平台名称',
    });
    const { getPublicPlatformConfig } = await import('./platform-config');
    const signal = new AbortController().signal;

    await expect(
      getPublicPlatformConfig('platform.name', signal),
    ).resolves.toBe('新平台名称');
    expect(clients.publicPost).toHaveBeenCalledExactlyOnceWith(
      '/public/platform-configs/get',
      { key: 'platform.name' },
      { signal },
    );
    expect(
      JSON.parse(
        localStorage.getItem('go-admin.public-platform-config') ?? '{}',
      ),
    ).toMatchObject({ 'platform.name': '新平台名称' });
    expect(clients.authenticatedPost).not.toHaveBeenCalled();
  });

  it('keeps the last valid snapshot when startup loading is unavailable', async () => {
    localStorage.setItem(
      'go-admin.public-platform-config',
      JSON.stringify({ 'platform.name': '缓存平台名称' }),
    );
    clients.publicPost.mockRejectedValueOnce(new Error('network unavailable'));
    const { loadPublicPlatformConfig } = await import('./platform-config');

    await expect(loadPublicPlatformConfig()).resolves.toMatchObject({
      'platform.name': '缓存平台名称',
    });
  });
});
