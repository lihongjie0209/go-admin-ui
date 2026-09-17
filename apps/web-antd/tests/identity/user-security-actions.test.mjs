import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const { forceLogoutUser, resetUserPassword, validateResetPassword } =
  await import('../../src/modules/identity/user-security-actions.ts');

beforeEach(() => {
  api.post.mockReset();
});

describe('user security actions', () => {
  it('validates the backend password byte-length contract and confirmation', () => {
    expect(validateResetPassword('short', 'different')).toEqual({
      confirmation: '两次输入的密码不一致',
      password: '密码长度必须为 12 至 1024 字节',
    });
    expect(
      validateResetPassword('安全密码安全密码', '安全密码安全密码'),
    ).toEqual({});
    expect(validateResetPassword('a'.repeat(1025), 'a'.repeat(1025))).toEqual({
      password: '密码长度必须为 12 至 1024 字节',
    });
  });

  it('resets the selected user password without returning or persisting it', async () => {
    api.post.mockResolvedValue({});
    await resetUserPassword('user-1', 'temporary-password');
    expect(api.post).toHaveBeenCalledWith('/auth/password/reset', {
      password: 'temporary-password',
      user_id: 'user-1',
    });
  });

  it('forces logout for the selected user ID', async () => {
    api.post.mockResolvedValue({});
    await forceLogoutUser({ id: 'user-1', username: 'alice' });
    expect(api.post).toHaveBeenCalledWith('/auth/sessions/force-logout-all', {
      user_id: 'user-1',
    });
  });
});
