import { flushPromises, mount } from '@vue/test-utils';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities, getAvailableTenantContexts } from '#/api/go';

import TenantSelectorPage from './index.vue';

vi.mock('@vben/common-ui', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    Page: defineComponent({
      setup(_, { slots }) {
        return () => h('main', slots.default?.());
      },
    }),
  };
});

vi.mock('@vben/stores', () => ({
  useAccessStore: () => ({
    setAccessCodes: vi.fn(),
    setAccessMenus: vi.fn(),
    setAccessRoutes: vi.fn(),
    setAccessToken: vi.fn(),
    setIsAccessChecked: vi.fn(),
  }),
  useTabbarStore: () => ({ $reset: vi.fn() }),
}));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('#/api/go', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#/api/go')>()),
  evaluateCapabilities: vi.fn(),
  getAvailableTenantContexts: vi.fn(),
  getPersistedTenantContext: vi.fn(() => null),
  switchTenantContext: vi.fn(),
}));

const evaluate = vi.mocked(evaluateCapabilities);
const loadTenants = vi.mocked(getAvailableTenantContexts);

describe('tenantSelectorPage', () => {
  beforeEach(() => {
    evaluate.mockReset();
    loadTenants.mockReset();
    loadTenants.mockResolvedValue([
      {
        is_administrator: false,
        joined_at: '2026-09-18T08:00:00+08:00',
        membership_id: 'membership-1',
        tenant_code: 'acme',
        tenant_id: 'tenant-1',
        tenant_name: 'Acme 租户',
      },
    ]);
  });

  it('does not request tenant data when list permission is denied', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        { allowed: false, key: 'tenant.selection:list' },
        { allowed: true, key: 'tenant.selection:switch' },
      ],
      revision: '1',
    });

    mount(TenantSelectorPage);
    await flushPromises();

    expect(loadTenants).not.toHaveBeenCalled();
  });

  it('loads the list but hides tenant actions when switch is denied', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        { allowed: true, key: 'tenant.selection:list' },
        { allowed: false, key: 'tenant.selection:switch' },
      ],
      revision: '1',
    });

    const wrapper = mount(TenantSelectorPage);
    await flushPromises();

    expect(loadTenants).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).not.toContain('Acme 租户');
  });
});
