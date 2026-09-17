/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- focused Ant Design behavior stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Drawer from '../../src/components/business/platform/TenantAdministratorDrawer.vue';

const state = vi.hoisted(() => ({
  error: vi.fn(),
  page: vi.fn(),
  set: vi.fn(),
  success: vi.fn(),
  track: vi.fn(),
}));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  trackFrontendAction: state.track,
}));
vi.mock('#/modules/platform/tenant-authorization', () => ({
  pageAdministratorCandidates: state.page,
  setTenantAdministrator: state.set,
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
  const Search = defineComponent({
    emits: ['search'],
    setup:
      (_, { emit }) =>
      () =>
        h('input', {
          'data-search': true,
          onChange: (event) => emit('search', event.target.value),
        }),
  });
  const Select = defineComponent({
    props: ['options', 'value'],
    emits: ['change'],
    setup:
      (props, { emit }) =>
      () =>
        h(
          'select',
          {
            value: props.value,
            onChange: (event) => emit('change', event.target.value),
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
            h('article', { 'data-member': record.membership_id }, [
              h('span', record.username),
              slots.bodyCell?.({ column: { key: 'action' }, record }),
            ]),
          ),
        ),
  });
  return {
    Alert: Box,
    Button,
    Drawer: defineComponent({
      props: ['open'],
      setup:
        (props, { slots }) =>
        () =>
          props.open ? h('aside', slots.default?.()) : null,
    }),
    Input: { Search },
    Popconfirm: defineComponent({
      emits: ['confirm'],
      setup:
        (_, { emit, slots }) =>
        () =>
          h('div', [
            slots.default?.(),
            h(
              'button',
              { 'data-confirm': true, onClick: () => emit('confirm') },
              '确认',
            ),
          ]),
    }),
    Select,
    Table,
    Tag: Box,
    message: { error: state.error, success: state.success },
  };
});
vi.mock('../../src/components/foundation/GoDateTimeText.vue', () => ({
  default: defineComponent({ setup: () => () => h('time') }),
}));
vi.mock('../../src/components/foundation/GoPagination.vue', () => ({
  default: defineComponent({ setup: () => () => h('nav') }),
}));

const candidate = {
  display_name: '平台管理员',
  is_administrator: false,
  joined_at: '2026-09-18T09:00:00+08:00',
  membership_id: 'membership-1',
  status: 'active',
  tenant_id: 'tenant-1',
  user_id: 'user-1',
  username: 'admin',
  version: 3,
};

let app;
let root;

async function flush() {
  for (let index = 0; index < 10; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount(scope = 'platform') {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp(Drawer, {
    open: true,
    scope,
    tenant: { id: 'tenant-1', name: '租户一' },
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  for (const mock of Object.values(state)) mock.mockReset();
  state.page.mockResolvedValue({
    items: [candidate],
    page: 1,
    page_size: 20,
    total: 1,
  });
  state.set.mockResolvedValue(undefined);
  state.track.mockImplementation(async (_event, operation) => operation());
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('tenant administrator drawer', () => {
  it('loads platform candidates with tenant scope and records administrator assignment', async () => {
    await mount();

    expect(state.page).toHaveBeenCalledWith(
      {
        keyword: '',
        page: 1,
        page_size: 20,
        statuses: [],
        tenant_id: 'tenant-1',
      },
      expect.any(AbortSignal),
      'platform',
    );
    root.querySelector('[data-confirm]').click();
    await flush();

    expect(state.set).toHaveBeenCalledWith(
      {
        enabled: true,
        membership_id: 'membership-1',
        tenant_id: 'tenant-1',
      },
      'platform',
    );
    expect(state.track).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'tenant:assign-administrator',
        resource_id: 'membership-1',
      }),
      expect.any(Function),
    );
    expect(state.success).toHaveBeenCalledWith('已设为租户管理员');
    expect(state.page).toHaveBeenCalledTimes(2);
  });

  it('uses tenant-local contracts, forwards filters, and cancels the active request on unmount', async () => {
    const pending = new Promise(() => {});
    state.page.mockReturnValueOnce(
      Promise.resolve({ items: [candidate], page: 1, page_size: 20, total: 1 }),
    );
    await mount('tenant');

    const search = root.querySelector('[data-search]');
    search.value = '  admin  ';
    search.dispatchEvent(new Event('change'));
    await flush();
    const select = root.querySelector('select');
    select.value = 'active';
    select.dispatchEvent(new Event('change'));
    await flush();

    expect(state.page).toHaveBeenLastCalledWith(
      {
        keyword: 'admin',
        page: 1,
        page_size: 20,
        statuses: ['active'],
      },
      expect.any(AbortSignal),
      'tenant',
    );

    state.page.mockReturnValueOnce(pending);
    search.value = 'pending';
    search.dispatchEvent(new Event('change'));
    await flush();
    const signal = state.page.mock.calls.at(-1)[1];
    app.unmount();
    app = undefined;
    expect(signal.aborted).toBe(true);
  });
});
