import { describe, expect, it, vi } from 'vitest';

import { ensureRequestID } from './request-id';

function headers(initial?: string) {
  let value = initial;
  return {
    get: vi.fn(() => value),
    set: vi.fn((_name: string, next: string) => {
      value = next;
    }),
  };
}

describe('ensureRequestID', () => {
  it('generates and writes a correlation ID when absent', () => {
    const target = headers();

    expect(ensureRequestID(target, () => 'generated-request-id')).toBe(
      'generated-request-id',
    );
    expect(target.set).toHaveBeenCalledExactlyOnceWith(
      'X-Request-ID',
      'generated-request-id',
    );
  });

  it('preserves a caller-provided ID across retries', () => {
    const target = headers('request-from-original-attempt');
    const generate = vi.fn(() => 'replacement');

    expect(ensureRequestID(target, generate)).toBe(
      'request-from-original-attempt',
    );
    expect(generate).not.toHaveBeenCalled();
    expect(target.set).not.toHaveBeenCalled();
  });
});
