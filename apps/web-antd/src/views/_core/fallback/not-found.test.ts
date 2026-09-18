import { flushPromises, shallowMount } from '@vue/test-utils';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import NotFound from './not-found.vue';

const { getApplicationHomePath, getCurrentApplication } = vi.hoisted(() => ({
  getApplicationHomePath: vi.fn(() => '/apps/app-1/home'),
  getCurrentApplication: vi.fn(),
}));

vi.mock('#/api/core/menu', () => ({
  getApplicationHomePath,
  getCurrentApplication,
}));

describe('not-found fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the current application home when it is readable', async () => {
    getCurrentApplication.mockResolvedValue({ id: 'app-1' });
    const wrapper = shallowMount(NotFound);
    await flushPromises();

    expect(wrapper.findComponent({ name: 'Fallback' }).props('homePath')).toBe(
      '/apps/app-1/home',
    );
  });

  it('falls back to the application selector when application lookup fails', async () => {
    getCurrentApplication.mockRejectedValue(new Error('forbidden'));
    const wrapper = shallowMount(NotFound);
    await flushPromises();

    expect(wrapper.findComponent({ name: 'Fallback' }).props('homePath')).toBe(
      '/apps',
    );
  });
});
