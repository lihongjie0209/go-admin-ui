import { afterEach, expect, it, vi } from 'vitest';

import { capabilityRefreshDelay } from './capability-refresh';

afterEach(() => vi.useRealTimers());

it('uses the server expiry with a bounded refresh delay', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-13T00:00:00Z'));
  expect(capabilityRefreshDelay('2026-10-13T00:00:15Z')).toBe(15_000);
  expect(capabilityRefreshDelay('2026-10-13T00:00:00.100Z')).toBe(1000);
  expect(capabilityRefreshDelay('2026-10-13T01:00:00Z')).toBe(300_000);
});

it('backs off when expiry is absent or already stale', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-13T00:00:00Z'));
  expect(capabilityRefreshDelay()).toBe(30_000);
  expect(capabilityRefreshDelay('2026-10-12T23:59:59Z')).toBe(30_000);
});
