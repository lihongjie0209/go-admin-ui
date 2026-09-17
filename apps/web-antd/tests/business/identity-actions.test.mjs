import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const { createdServiceAccount, rotateServiceAccountSecret } =
  await import('../../src/modules/identity/service-account-actions.ts');
const { logoutAllSessions, revokeSession } =
  await import('../../src/modules/identity/session-actions.ts');

beforeEach(() => {
  api.post.mockReset();
});

describe('identity management actions', () => {
  it('rotates a service account secret with optimistic versioning', async () => {
    const result = {
      account: { id: 'account-1', version: 4 },
      secret: 'secret-once',
    };
    api.post.mockResolvedValue(result);

    await expect(
      rotateServiceAccountSecret({ id: 'account-1', version: 3 }),
    ).resolves.toEqual(result);
    expect(api.post).toHaveBeenCalledWith('/service-accounts/secret/rotate', {
      id: 'account-1',
      version: 3,
    });
  });

  it('rejects malformed one-time secret responses instead of hiding loss', () => {
    expect(() =>
      createdServiceAccount({ account: { id: 'account-1' } }),
    ).toThrow('服务器没有返回一次性密钥');
  });

  it('revokes one session with its version and supports logout-all', async () => {
    api.post.mockResolvedValue({});

    await revokeSession({ id: 'session-1', version: 8 });
    await logoutAllSessions();

    expect(api.post).toHaveBeenNthCalledWith(1, '/auth/sessions/revoke', {
      session_id: 'session-1',
      version: 8,
    });
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/auth/sessions/logout-all',
      {},
    );
  });
});
