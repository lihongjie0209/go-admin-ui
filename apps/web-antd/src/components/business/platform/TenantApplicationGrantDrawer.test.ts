import { flushPromises, mount } from '@vue/test-utils';
import { h } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities } from '#/api/go';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';
import {
  listActiveApplications,
  pageTenantApplicationGrants,
} from '#/modules/platform/tenant-application-grants';

import TenantApplicationGrantDrawer from './TenantApplicationGrantDrawer.vue';

vi.mock('#/api/go', () => ({ evaluateCapabilities: vi.fn() }));

vi.mock(
  '#/modules/platform/tenant-application-grants',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('#/modules/platform/tenant-application-grants')
    >()),
    findTenantApplicationGrant: vi.fn(),
    getTenantApplicationGrant: vi.fn(),
    grantTenantApplication: vi.fn(),
    listActiveApplications: vi.fn(),
    pageTenantApplicationGrants: vi.fn(),
    revokeTenantApplication: vi.fn(),
  }),
);

const evaluate = vi.mocked(evaluateCapabilities);
const listApplications = vi.mocked(listActiveApplications);
const pageGrants = vi.mocked(pageTenantApplicationGrants);

describe('tenantApplicationGrantDrawer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('loads existing grants without requesting application options when application list is denied', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        { allowed: true, key: 'tenant.application-grant:list' },
        { allowed: true, key: 'tenant.application-grant:grant' },
        { allowed: true, key: 'tenant.application-grant:revoke' },
        { allowed: true, key: 'tenant.application-grant:read' },
        { allowed: false, key: 'application:list' },
      ],
      revision: '1',
    });
    pageGrants.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
    });
    listApplications.mockResolvedValue([]);
    const capabilities = [
      ['tenant.application-grant', 'list'],
      ['tenant.application-grant', 'grant'],
      ['tenant.application-grant', 'revoke'],
      ['tenant.application-grant', 'read'],
      ['application', 'list'],
    ].map(([resource, action]) => ({
      action: String(action),
      key: `${resource}:${action}`,
      resource: String(resource),
    }));

    const wrapper = mount(GoCapabilityProvider, {
      attachTo: document.body,
      props: { capabilities },
      slots: {
        default: () =>
          h(TenantApplicationGrantDrawer, {
            open: true,
            tenant: { id: 'tenant-1', name: '测试租户' },
            'onUpdate:open': vi.fn(),
          }),
      },
    });
    await flushPromises();

    expect(pageGrants).toHaveBeenCalledTimes(1);
    expect(listApplications).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('授予应用');
    wrapper.unmount();
  });
});
