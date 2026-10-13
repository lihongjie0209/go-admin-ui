import { flushPromises, mount } from '@vue/test-utils';
import { h } from 'vue';

import { Select } from 'ant-design-vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities } from '#/api/go';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';
import {
  pageActiveApplications,
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
    pageActiveApplications: vi.fn(),
    pageTenantApplicationGrants: vi.fn(),
    revokeTenantApplication: vi.fn(),
  }),
);

const evaluate = vi.mocked(evaluateCapabilities);
const pageApplications = vi.mocked(pageActiveApplications);
const pageGrants = vi.mocked(pageTenantApplicationGrants);

describe('tenantApplicationGrantDrawer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    vi.useRealTimers();
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
    pageApplications.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 50,
      total: 0,
    });
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
    expect(pageApplications).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('授予应用');
    wrapper.unmount();
  });

  it('按需搜索并滚动加载启用应用，不预加载全量候选', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        { allowed: true, key: 'tenant.application-grant:list' },
        { allowed: true, key: 'tenant.application-grant:grant' },
        { allowed: false, key: 'tenant.application-grant:revoke' },
        { allowed: false, key: 'tenant.application-grant:read' },
        { allowed: true, key: 'application:list' },
      ],
      revision: '1',
    });
    pageGrants.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
    });
    pageApplications
      .mockResolvedValueOnce({
        items: [
          { code: 'first', id: 'app-1', name: '第一应用', status: 'active' },
        ],
        page: 1,
        page_size: 50,
        total: 2,
      })
      .mockResolvedValueOnce({
        items: [
          { code: 'second', id: 'app-2', name: '第二应用', status: 'active' },
        ],
        page: 2,
        page_size: 50,
        total: 2,
      })
      .mockResolvedValueOnce({
        items: [
          { code: 'search', id: 'app-3', name: '搜索应用', status: 'active' },
        ],
        page: 1,
        page_size: 50,
        total: 1,
      });
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
          }),
      },
    });
    await flushPromises();
    expect(pageApplications).toHaveBeenCalledTimes(1);
    expect(pageApplications).toHaveBeenCalledWith(
      { keyword: '', page: 1, page_size: 50 },
      expect.any(AbortSignal),
    );

    const applicationSelect = wrapper.findAllComponents(Select).at(0);
    if (!applicationSelect) throw new Error('缺少应用选择器');
    applicationSelect.vm.$emit('popupScroll', {
      target: { clientHeight: 100, scrollHeight: 100, scrollTop: 0 },
    });
    await flushPromises();
    expect(pageApplications).toHaveBeenNthCalledWith(
      2,
      { keyword: '', page: 2, page_size: 50 },
      expect.any(AbortSignal),
    );

    applicationSelect.vm.$emit('update:value', 'app-2');
    applicationSelect.vm.$emit('change', 'app-2');
    vi.useFakeTimers();
    applicationSelect.vm.$emit('search', '搜索');
    await vi.advanceTimersByTimeAsync(250);
    vi.useRealTimers();
    await flushPromises();
    expect(pageApplications).toHaveBeenNthCalledWith(
      3,
      { keyword: '搜索', page: 1, page_size: 50 },
      expect.any(AbortSignal),
    );
    expect(applicationSelect.props('options')).toEqual([
      { label: '第二应用（second）', value: 'app-2' },
      { label: '搜索应用（search）', value: 'app-3' },
    ]);
    wrapper.unmount();
  });

  it('搜索切换后丢弃旧响应，避免过期候选覆盖新结果', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        { allowed: true, key: 'tenant.application-grant:list' },
        { allowed: true, key: 'tenant.application-grant:grant' },
        { allowed: true, key: 'application:list' },
      ],
      revision: '1',
    });
    pageGrants.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 20,
      total: 0,
    });
    let releaseOld!: (value: {
      items: { code: string; id: string; name: string; status: string }[];
      page: number;
      page_size: number;
      total: number;
    }) => void;
    pageApplications
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseOld = resolve;
          }),
      )
      .mockResolvedValueOnce({
        items: [{ code: 'new', id: 'new', name: '新应用', status: 'active' }],
        page: 1,
        page_size: 50,
        total: 1,
      });
    const capabilities = [
      ['tenant.application-grant', 'list'],
      ['tenant.application-grant', 'grant'],
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
          }),
      },
    });
    await flushPromises();
    const applicationSelect = wrapper.findAllComponents(Select).at(0);
    if (!applicationSelect) throw new Error('缺少应用选择器');
    vi.useFakeTimers();
    applicationSelect.vm.$emit('search', '新');
    await vi.advanceTimersByTimeAsync(250);
    vi.useRealTimers();
    await flushPromises();
    releaseOld({
      items: [{ code: 'old', id: 'old', name: '旧应用', status: 'active' }],
      page: 1,
      page_size: 50,
      total: 1,
    });
    await flushPromises();

    expect(applicationSelect.props('options')).toEqual([
      { label: '新应用（new）', value: 'new' },
    ]);
    wrapper.unmount();
  });
});
