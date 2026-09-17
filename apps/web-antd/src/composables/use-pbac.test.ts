import { flushPromises } from '@vue/test-utils';
import { effectScope, ref } from 'vue';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evaluateRowCapabilities } from '#/api/go';

import { useRowCapabilities } from './use-pbac';

vi.mock('#/api/go', () => ({
  evaluateCapabilities: vi.fn(),
  evaluateRowCapabilities: vi.fn(),
}));

const evaluateRows = vi.mocked(evaluateRowCapabilities);

function deferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function inScope<T>(factory: () => T) {
  const scope = effectScope();
  const value = scope.run(factory);
  if (value === undefined) throw new Error('effect scope did not run');
  return { scope, value };
}

describe('useRowCapabilities', () => {
  beforeEach(() => evaluateRows.mockReset());

  it('deduplicates actions and row IDs before one batch evaluation', async () => {
    evaluateRows.mockResolvedValueOnce({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        {
          actions: { delete: false, update: true },
          resource_id: 'user-1',
        },
      ],
      resource: 'identity.user',
      revision: '8',
    });
    const ids = ref(['user-1', 'user-1']);
    const actions = ref(['update', 'delete', 'update']);
    const { scope, value: capability } = inScope(() =>
      useRowCapabilities('identity.user', actions, ids),
    );

    await flushPromises();

    expect(evaluateRows).toHaveBeenCalledWith(
      'identity.user',
      ['update', 'delete'],
      ['user-1'],
    );
    expect(capability.allowed('user-1', 'update')).toBe(true);
    expect(capability.allowed('user-1', 'delete')).toBe(false);
    expect(capability.allowed('unknown', 'update')).toBe(false);
    scope.stop();
  });

  it('clears prior decisions and fails closed when evaluation fails', async () => {
    evaluateRows
      .mockResolvedValueOnce({
        expires_at: '2026-09-18T10:00:00+08:00',
        items: [{ actions: { update: true }, resource_id: 'user-1' }],
        resource: 'identity.user',
        revision: '8',
      })
      .mockRejectedValueOnce(new Error('authorization unavailable'));
    const ids = ref(['user-1']);
    const { scope, value: capability } = inScope(() =>
      useRowCapabilities('identity.user', ['update'], ids),
    );
    await flushPromises();
    expect(capability.allowed('user-1', 'update')).toBe(true);

    ids.value = ['user-2'];
    await flushPromises();

    expect(capability.allowed('user-1', 'update')).toBe(false);
    expect(capability.allowed('user-2', 'update')).toBe(false);
    expect(capability.error.value).toEqual(
      new Error('authorization unavailable'),
    );
    scope.stop();
  });

  it('ignores a stale evaluation after the table page changes', async () => {
    const first =
      deferred<Awaited<ReturnType<typeof evaluateRowCapabilities>>>();
    const second =
      deferred<Awaited<ReturnType<typeof evaluateRowCapabilities>>>();
    evaluateRows
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const ids = ref(['page-1-row']);
    const { scope, value: capability } = inScope(() =>
      useRowCapabilities('tenant.member', ['update'], ids),
    );
    await flushPromises();

    ids.value = ['page-2-row'];
    await flushPromises();
    second.resolve({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [{ actions: { update: true }, resource_id: 'page-2-row' }],
      resource: 'tenant.member',
      revision: '10',
    });
    await flushPromises();
    first.resolve({
      expires_at: '2026-09-18T09:59:00+08:00',
      items: [{ actions: { update: true }, resource_id: 'page-1-row' }],
      resource: 'tenant.member',
      revision: '9',
    });
    await flushPromises();

    expect(capability.allowed('page-2-row', 'update')).toBe(true);
    expect(capability.allowed('page-1-row', 'update')).toBe(false);
    scope.stop();
  });
});
