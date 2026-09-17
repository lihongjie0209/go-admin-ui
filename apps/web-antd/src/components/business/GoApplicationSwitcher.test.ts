import { flushPromises, mount } from '@vue/test-utils';
import { h } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMyMenuUsage, getNavigationApplications } from '#/api/core/menu';
import { evaluateCapabilities } from '#/api/go';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';
import { applicationSelectionCapabilities } from '#/modules/platform/application-selection-capabilities';

import GoApplicationSwitcher from './GoApplicationSwitcher.vue';

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
  useRoute: () => ({ fullPath: '/apps' }),
}));

vi.mock('#/router', () => ({
  resetRoutes: vi.fn(),
  router: { replace: vi.fn() },
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

function mountSwitcher() {
  return mount(GoCapabilityProvider, {
    attachTo: document.body,
    props: { capabilities: applicationSelectionCapabilities },
    slots: {
      default: () =>
        h(GoApplicationSwitcher, {
          currentApplicationKey: 'current',
          open: true,
          'onUpdate:open': vi.fn(),
        }),
    },
  });
}

describe('goApplicationSwitcher', () => {
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

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('loads the application list without requiring optional usage access', async () => {
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

    const wrapper = mountSwitcher();
    await flushPromises();

    expect(loadApplications).toHaveBeenCalledTimes(1);
    expect(loadUsage).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('没有完整的应用切换权限');
    wrapper.unmount();
  });

  it('shows applications after all switch capabilities are granted', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: applicationSelectionCapabilities.map((item) => ({
        allowed: true,
        key: item.key,
      })),
      revision: '1',
    });

    const wrapper = mountSwitcher();
    await flushPromises();

    expect(loadApplications).toHaveBeenCalledTimes(1);
    expect(loadUsage).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('Acme 应用');
    wrapper.unmount();
  });
});
