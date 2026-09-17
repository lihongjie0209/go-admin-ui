/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- focused Ant Design behavior stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GrantDrawer from '../../src/components/business/platform/TenantApplicationGrantDrawer.vue';
import CapabilityProvider from '../../src/components/foundation/GoCapabilityProvider.vue';

const state = vi.hoisted(() => ({
  evaluate: vi.fn(),
  find: vi.fn(),
  grant: vi.fn(),
  listApplications: vi.fn(),
  page: vi.fn(),
  revoke: vi.fn(),
  success: vi.fn(),
  track: vi.fn(),
}));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  evaluateCapabilities: state.evaluate,
  trackFrontendAction: state.track,
}));
vi.mock('#/modules/platform/tenant-application-grants', () => ({
  findTenantApplicationGrant: state.find,
  grantTenantApplication: state.grant,
  listActiveApplications: state.listApplications,
  pageTenantApplicationGrants: state.page,
  revokeTenantApplication: state.revoke,
}));
vi.mock('ant-design-vue', () => {
  const Box = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('div', slots.default?.()),
  });
  const Button = defineComponent({
    props: ['disabled', 'loading'],
    emits: ['click'],
    setup:
      (props, { emit, slots }) =>
      () =>
        h(
          'button',
          {
            disabled: props.disabled || props.loading,
            onClick: () => emit('click'),
          },
          slots.default?.(),
        ),
  });
  const Select = defineComponent({
    props: ['options', 'value'],
    emits: ['change', 'update:value'],
    setup:
      (props, { emit }) =>
      () =>
        h(
          'select',
          {
            value: props.value,
            onChange: (event) => {
              emit('update:value', event.target.value);
              emit('change', event.target.value);
            },
          },
          props.options?.map((option) =>
            h('option', { value: option.value }, option.label),
          ),
        ),
  });
  const Table = defineComponent({
    props: ['dataSource'],
    setup:
      (props, { slots }) =>
      () =>
        h(
          'section',
          props.dataSource?.map((record) =>
            h('article', { 'data-grant': record.id }, [
              h('span', record.application_name),
              slots.bodyCell?.({ column: { key: 'status' }, record }),
              slots.bodyCell?.({ column: { key: 'action' }, record }),
            ]),
          ),
        ),
  });
  return {
    Alert: Box,
    Button,
    DatePicker: { RangePicker: Box },
    Drawer: defineComponent({
      props: ['open'],
      setup:
        (props, { slots }) =>
        () =>
          props.open ? h('aside', slots.default?.()) : null,
    }),
    Form: Box,
    FormItem: Box,
    Input: { Search: Box },
    Popconfirm: defineComponent({
      emits: ['confirm'],
      setup:
        (_, { emit, slots }) =>
        () =>
          h('div', [
            slots.default?.(),
            h(
              'button',
              { 'data-confirm-revoke': true, onClick: () => emit('confirm') },
              '确认撤销',
            ),
          ]),
    }),
    Select,
    Space: Box,
    Table,
    Tag: Box,
    message: { error: vi.fn(), success: state.success },
  };
});
vi.mock('../../src/components/foundation/GoDateTimeText.vue', () => ({
  default: defineComponent({ setup: () => () => h('time') }),
}));
vi.mock('../../src/components/foundation/GoPagination.vue', () => ({
  default: defineComponent({ setup: () => () => h('nav') }),
}));
vi.mock(
  '../../src/components/business/platform/TenantApplicationGrantDetail.vue',
  () => ({ default: defineComponent({ setup: () => () => h('div') }) }),
);

const capabilities = ['list', 'grant', 'revoke', 'read'].map((action) => ({
  action,
  key: `tenant.application-grant:${action}`,
  resource: 'tenant.application-grant',
}));
const grant = {
  application_code: 'console',
  application_id: 'application-1',
  application_name: '管理台',
  id: 'grant-1',
  status: 'active',
  tenant_id: 'tenant-1',
  tenant_name: '租户一',
  version: 4,
};

let app;
let root;

async function flush() {
  for (let index = 0; index < 12; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount() {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({
    setup: () => () =>
      h(
        CapabilityProvider,
        { capabilities },
        {
          default: () =>
            h(GrantDrawer, {
              open: true,
              tenant: { id: 'tenant-1', name: '租户一' },
            }),
        },
      ),
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  for (const mock of Object.values(state)) mock.mockReset();
  state.evaluate.mockImplementation(async (request) => ({
    items: request.map(({ key }) => ({ allowed: true, key })),
  }));
  state.page.mockResolvedValue({
    items: [grant],
    page: 1,
    page_size: 20,
    total: 1,
  });
  state.listApplications.mockResolvedValue([
    { code: 'console', id: 'application-1', name: '管理台', status: 'active' },
  ]);
  state.find.mockResolvedValue(grant);
  state.grant.mockResolvedValue(grant);
  state.revoke.mockResolvedValue(undefined);
  state.track.mockImplementation(async (_event, operation) => operation());
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('tenant application grant drawer', () => {
  it('loads the tenant-scoped page and reuses the current optimistic version when granting', async () => {
    await mount();

    expect(state.page).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        page_size: 20,
        tenant_id: 'tenant-1',
      }),
      expect.any(AbortSignal),
    );
    const application = root.querySelector('select');
    application.value = 'application-1';
    application.dispatchEvent(new Event('change'));
    await flush();
    const save = [...root.querySelectorAll('button')].find((button) =>
      button.textContent.includes('更新有效期'),
    );
    save.click();
    await flush();

    expect(state.find).toHaveBeenCalledWith('tenant-1', 'application-1');
    expect(state.grant).toHaveBeenCalledWith({
      application_id: 'application-1',
      expires_at: null,
      starts_at: null,
      tenant_id: 'tenant-1',
      version: 4,
    });
    expect(state.track).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'tenant.application-grant:grant',
        resource_id: 'application-1',
      }),
      expect.any(Function),
    );
    expect(state.success).toHaveBeenCalledWith('租户应用授权已保存');
  });

  it('revokes the exact versioned grant and records its grant ID', async () => {
    await mount();
    root.querySelector('[data-confirm-revoke]').click();
    await flush();

    expect(state.revoke).toHaveBeenCalledWith(grant);
    expect(state.track).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'tenant.application-grant:revoke',
        resource_id: 'grant-1',
      }),
      expect.any(Function),
    );
    expect(state.success).toHaveBeenCalledWith('应用授权已撤销');
  });
});
