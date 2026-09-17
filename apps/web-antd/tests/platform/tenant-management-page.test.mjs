/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- page-composition stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TenantsPage from '../../src/views/platform/tenants/index.vue';

const state = vi.hoisted(() => ({
  administratorsProps: null,
  flatContract: null,
  grantsProps: null,
  loadPermissions: vi.fn(),
  reload: vi.fn(),
  savePermissions: vi.fn(),
  selectionProps: null,
}));

vi.mock('@vben/common-ui', () => ({
  Page: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('main', slots.default?.()),
  }),
}));
vi.mock('../../src/templates/resource/FlatResourcePage.vue', () => ({
  default: defineComponent({
    props: ['contract'],
    setup(props, { expose, slots }) {
      expose({ reload: state.reload });
      return () => {
        state.flatContract = props.contract;
        return h('section', slots.toolbar?.());
      };
    },
  }),
}));
vi.mock('../../src/components/business/GoSelectionDrawer.vue', () => ({
  default: defineComponent({
    inheritAttrs: false,
    props: ['load', 'open', 'save', 'telemetry', 'title'],
    setup:
      (props, { attrs }) =>
      () => {
        state.selectionProps = { ...attrs, ...props };
        return h('aside');
      },
  }),
}));
vi.mock(
  '../../src/components/business/platform/TenantAdministratorDrawer.vue',
  () => ({
    default: defineComponent({
      props: ['open', 'tenant'],
      setup: (props) => () => {
        state.administratorsProps = props;
        return h('aside');
      },
    }),
  }),
);
vi.mock(
  '../../src/components/business/platform/TenantApplicationGrantDrawer.vue',
  () => ({
    default: defineComponent({
      props: ['open', 'tenant'],
      setup: (props) => () => {
        state.grantsProps = props;
        return h('aside');
      },
    }),
  }),
);
vi.mock('#/modules/platform/tenant-authorization', () => ({
  loadTenantPermissionCeiling: state.loadPermissions,
  saveTenantPermissionCeiling: state.savePermissions,
}));

let app;
let root;

async function flush() {
  for (let index = 0; index < 8; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount() {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp(TenantsPage);
  app.mount(root);
  await flush();
}

beforeEach(() => {
  for (const value of Object.values(state)) {
    if (typeof value?.mockReset === 'function') value.mockReset();
  }
  state.administratorsProps = null;
  state.flatContract = null;
  state.grantsProps = null;
  state.selectionProps = null;
  state.loadPermissions.mockResolvedValue({ items: [], selected: [] });
  state.savePermissions.mockResolvedValue(undefined);
  state.reload.mockResolvedValue(undefined);
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('platform tenant management page', () => {
  it('binds the permission ceiling to the selected optimistic tenant snapshot', async () => {
    await mount();
    const action = state.flatContract.table.rowActions.find(
      (item) => item.key === 'permission-ceiling',
    );
    await action.run({ id: 'tenant-1', name: '租户一', version: 6 });
    await flush();

    expect(state.selectionProps.open).toBe(true);
    expect(state.selectionProps.telemetry).toEqual({
      eventName: 'tenant:grant',
      resourceId: 'tenant-1',
    });
    const signal = new AbortController().signal;
    await state.selectionProps.load(signal);
    await state.selectionProps.save(['permission-1', 'permission-2']);
    expect(state.loadPermissions).toHaveBeenCalledWith('tenant-1', signal);
    expect(state.savePermissions).toHaveBeenCalledWith(
      { id: 'tenant-1', name: '租户一', version: 6 },
      ['permission-1', 'permission-2'],
    );
    state.selectionProps.onSaved();
    await flush();
    expect(state.reload).toHaveBeenCalled();
  });

  it('opens administrator management for the exact selected tenant', async () => {
    await mount();
    const action = state.flatContract.table.rowActions.find(
      (item) => item.key === 'tenant-administrators',
    );
    await action.run({ id: 'tenant-2', name: '租户二', version: 3 });
    await flush();

    expect(state.administratorsProps.open).toBe(true);
    expect(state.administratorsProps.tenant).toEqual({
      id: 'tenant-2',
      name: '租户二',
      version: 3,
    });
  });

  it('opens application grants for the exact selected tenant', async () => {
    await mount();
    const action = state.flatContract.table.rowActions.find(
      (item) => item.key === 'application-grants',
    );
    await action.run({ id: 'tenant-3', name: '租户三', version: 8 });
    await flush();

    expect(state.grantsProps.open).toBe(true);
    expect(state.grantsProps.tenant).toEqual({
      id: 'tenant-3',
      name: '租户三',
      version: 8,
    });
  });
});
