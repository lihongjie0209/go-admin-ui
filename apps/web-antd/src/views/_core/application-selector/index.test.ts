import { flushPromises, mount } from '@vue/test-utils';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getMyMenuUsage, getNavigationApplications } from '#/api/core/menu';
import { evaluateCapabilities } from '#/api/go';

import ApplicationSelectorPage from './index.vue';

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
    setAccessMenus: vi.fn(),
    setAccessRoutes: vi.fn(),
    setIsAccessChecked: vi.fn(),
  }),
  useTabbarStore: () => ({ $reset: vi.fn(), tabs: [] }),
}));

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('#/api/go', () => ({
  evaluateCapabilities: vi.fn(),
}));

vi.mock('#/api/core/menu', () => ({
  getApplicationHomePath: vi.fn(() => '/app/acme/home'),
  getMyMenuUsage: vi.fn(),
  getNavigationApplications: vi.fn(),
  selectApplication: vi.fn(),
}));

const evaluate = vi.mocked(evaluateCapabilities);
const loadApplications = vi.mocked(getNavigationApplications);
const loadUsage = vi.mocked(getMyMenuUsage);

describe('applicationSelectorPage', () => {
  beforeEach(() => {
    evaluate.mockReset();
    loadApplications.mockReset();
    loadUsage.mockReset();
    loadApplications.mockResolvedValue([
      {
        description: '业务应用',
        home_path: '/app/acme/home',
        icon: null,
        id: 'application-1',
        key: 'acme',
        menus: [],
        name: 'Acme 应用',
        type: 'organization',
      },
    ]);
    loadUsage.mockResolvedValue([]);
  });

  it('does not load application data when list capability is denied', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        { allowed: false, key: 'application.current:list' },
        { allowed: true, key: 'navigation.current:read' },
      ],
      revision: '1',
    });

    mount(ApplicationSelectorPage);
    await flushPromises();

    expect(loadApplications).not.toHaveBeenCalled();
  });

  it('loads applications independently and hides entries without navigation access', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        { allowed: true, key: 'application.current:list' },
        { allowed: true, key: 'application.current:read' },
        { allowed: true, key: 'application.current:switch' },
        { allowed: false, key: 'navigation.current:read' },
      ],
      revision: '1',
    });

    const wrapper = mount(ApplicationSelectorPage);
    await flushPromises();

    expect(loadApplications).toHaveBeenCalledTimes(1);
    expect(loadUsage).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('Acme 应用');
  });
});
