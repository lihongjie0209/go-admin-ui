import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: api }));

const { getSelfProfile, updateSelfProfile, validateSelfProfile } =
  await import('../../src/modules/identity/self-profile.ts');

beforeEach(() => {
  api.post.mockReset();
});

describe('self profile', () => {
  it('loads only the authenticated profile without accepting a user ID', async () => {
    const controller = new AbortController();
    api.post.mockResolvedValue({ id: 'user-1' });
    await getSelfProfile(controller.signal);
    expect(api.post).toHaveBeenCalledWith(
      '/profile/get',
      {},
      { signal: controller.signal },
    );
  });

  it('sends the optimistic version with editable fields only', async () => {
    api.post.mockResolvedValue({ id: 'user-1', version: 4 });
    await updateSelfProfile({
      display_name: 'Alice',
      email: 'alice@example.com',
      phone: '13800000000',
      version: 3,
    });
    expect(api.post).toHaveBeenCalledWith('/profile/update', {
      display_name: 'Alice',
      email: 'alice@example.com',
      phone: '13800000000',
      version: 3,
    });
  });

  it('validates the same bounded profile fields before submitting', () => {
    expect(
      validateSelfProfile({
        display_name: ' ',
        email: 'x'.repeat(321),
        phone: '1'.repeat(65),
        version: 1,
      }),
    ).toEqual({
      display_name: '请输入显示名称',
      email: '邮箱不能超过 320 个字符',
      phone: '手机号不能超过 64 个字符',
    });
  });
});
