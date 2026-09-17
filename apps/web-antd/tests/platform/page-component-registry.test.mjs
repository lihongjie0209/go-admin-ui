import { describe, expect, it } from 'vitest';

import {
  isRegisteredPageComponent,
  loadPageComponentOptions,
  normalizePageComponentID,
  registeredPageComponents,
} from '../../src/modules/platform/page-component-registry.ts';

describe('page component registry', () => {
  it('discovers compiled business pages with canonical component IDs', () => {
    const options = registeredPageComponents();
    expect(options).toContainEqual({
      label: 'platform / users / index',
      value: 'platform/users/index',
    });
    expect(options).toContainEqual({
      label: 'platform / runtime / index',
      value: 'platform/runtime/index',
    });
    expect(options.some((option) => option.value.startsWith('_core/'))).toBe(
      false,
    );
  });

  it('normalizes IDs and rejects pages that were not compiled', () => {
    expect(normalizePageComponentID('/platform/users/index.vue')).toBe(
      'platform/users/index',
    );
    expect(isRegisteredPageComponent('platform/users/index')).toBe(true);
    expect(isRegisteredPageComponent('_core/fallback/not-found')).toBe(true);
    expect(isRegisteredPageComponent('platform/not-compiled/index')).toBe(
      false,
    );
  });

  it('honors cancellation before loading local options', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      loadPageComponentOptions({}, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
