import { describe, expect, it, vi } from 'vitest';

import { authenticateResponseInterceptor } from './preset-interceptors';

function deferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function unauthorized(url: string) {
  return {
    config: { headers: {}, url },
    response: { status: 401 },
  };
}

function invokeRejected(
  interceptor: ReturnType<typeof authenticateResponseInterceptor>,
  error: unknown,
) {
  if (!interceptor.rejected) throw new Error('rejected interceptor is missing');
  return interceptor.rejected(error);
}

describe('authenticateResponseInterceptor', () => {
  it('refreshes once and replays every concurrent unauthorized request', async () => {
    const refresh = deferred<string>();
    const client = { request: vi.fn(async (url) => `replayed:${url}`) };
    const doRefreshToken = vi.fn(() => refresh.promise);
    const doReAuthenticate = vi.fn(async () => {});
    const interceptor = authenticateResponseInterceptor({
      client: client as never,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: true,
      formatToken: (token) => `Bearer ${token}`,
    });

    const firstError = unauthorized('/first');
    const secondError = unauthorized('/second');
    const first = invokeRejected(interceptor, firstError);
    const second = invokeRejected(interceptor, secondError);
    refresh.resolve('new-token');

    await expect(Promise.all([first, second])).resolves.toEqual([
      'replayed:/first',
      'replayed:/second',
    ]);
    expect(doRefreshToken).toHaveBeenCalledTimes(1);
    expect(doReAuthenticate).not.toHaveBeenCalled();
    expect(firstError.config).toMatchObject({
      __isRetryRequest: true,
      headers: { Authorization: 'Bearer new-token' },
    });
    expect(secondError.config).toMatchObject({
      __isRetryRequest: true,
      headers: { Authorization: 'Bearer new-token' },
    });
  });

  it('rejects every waiter and reauthenticates once when refresh fails', async () => {
    const refresh = deferred<string>();
    const client = { request: vi.fn() };
    const doRefreshToken = vi.fn(() => refresh.promise);
    const doReAuthenticate = vi.fn(async () => {});
    const interceptor = authenticateResponseInterceptor({
      client: client as never,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: true,
      formatToken: (token) => `Bearer ${token}`,
    });

    const first = invokeRejected(interceptor, unauthorized('/first'));
    const second = invokeRejected(interceptor, unauthorized('/second'));
    const refreshError = new Error('refresh failed');
    refresh.reject(refreshError);

    const results = await Promise.allSettled([first, second]);
    expect(results).toEqual([
      { reason: refreshError, status: 'rejected' },
      { reason: refreshError, status: 'rejected' },
    ]);
    expect(doRefreshToken).toHaveBeenCalledTimes(1);
    expect(doReAuthenticate).toHaveBeenCalledTimes(1);
    expect(client.request).not.toHaveBeenCalled();
  });

  it('does not refresh a replayed request that is still unauthorized', async () => {
    const originalError = unauthorized('/replayed');
    originalError.config.__isRetryRequest = true;
    const doRefreshToken = vi.fn(async () => 'unused');
    const doReAuthenticate = vi.fn(async () => {});
    const interceptor = authenticateResponseInterceptor({
      client: { request: vi.fn() } as never,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: true,
      formatToken: (token) => `Bearer ${token}`,
    });

    await expect(invokeRejected(interceptor, originalError)).rejects.toBe(
      originalError,
    );
    expect(doRefreshToken).not.toHaveBeenCalled();
    expect(doReAuthenticate).toHaveBeenCalledTimes(1);
  });

  it('does not treat a replay failure as a refresh failure', async () => {
    const replayError = new Error('upstream failed');
    const client = {
      request: vi.fn(async () => {
        throw replayError;
      }),
    };
    const doReAuthenticate = vi.fn(async () => {});
    const interceptor = authenticateResponseInterceptor({
      client: client as never,
      doReAuthenticate,
      doRefreshToken: vi.fn(async () => 'new-token'),
      enableRefreshToken: true,
      formatToken: (token) => `Bearer ${token}`,
    });

    await expect(
      invokeRejected(interceptor, unauthorized('/temporarily-unavailable')),
    ).rejects.toBe(replayError);
    expect(doReAuthenticate).not.toHaveBeenCalled();
  });
});
