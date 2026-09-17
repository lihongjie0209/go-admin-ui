/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- page-composition stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MembersPage from '../../src/views/tenant/members/index.vue';
import RolesPage from '../../src/views/tenant/roles/index.vue';

const state = vi.hoisted(() => ({
  effectiveProps: null,
  flatContract: null,
  loadMemberRoles: vi.fn(),
  loadRolePermissions: vi.fn(),
  reload: vi.fn(),
  saveMemberRoles: vi.fn(),
  saveRolePermissions: vi.fn(),
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
    setup(props, { expose }) {
      expose({ reload: state.reload });
      return () => {
        state.flatContract = props.contract;
        return h('section');
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
        return h('aside', { 'data-selection-open': String(props.open) });
      },
  }),
}));
vi.mock(
  '../../src/components/business/tenant/EffectivePermissionDrawer.vue',
  () => ({
    default: defineComponent({
      props: ['member', 'open'],
      setup: (props) => () => {
        state.effectiveProps = props;
        return h('aside');
      },
    }),
  }),
);
vi.mock('#/modules/tenant/member-role-assignment', () => ({
  loadMemberRoleAssignment: state.loadMemberRoles,
  saveMemberRoleAssignment: state.saveMemberRoles,
}));
vi.mock('#/modules/tenant/role-permission-assignment', () => ({
  loadRolePermissionAssignment: state.loadRolePermissions,
  saveRolePermissionAssignment: state.saveRolePermissions,
}));

let app;
let root;

async function flush() {
  for (let index = 0; index < 8; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount(component) {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp(component);
  app.mount(root);
  await flush();
}

beforeEach(() => {
  for (const value of Object.values(state)) {
    if (typeof value?.mockReset === 'function') value.mockReset();
  }
  state.flatContract = null;
  state.selectionProps = null;
  state.effectiveProps = null;
  state.loadMemberRoles.mockResolvedValue({ items: [], selected: [] });
  state.loadRolePermissions.mockResolvedValue({ items: [], selected: [] });
  state.saveMemberRoles.mockResolvedValue(undefined);
  state.saveRolePermissions.mockResolvedValue(undefined);
  state.reload.mockResolvedValue(undefined);
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('tenant authorization pages', () => {
  it('binds member role assignment to the selected versioned membership', async () => {
    await mount(MembersPage);
    const action = state.flatContract.table.rowActions.find(
      (item) => item.key === 'assign-role',
    );
    expect(action.rowAuthorization).toBe(true);
    await action.run({
      display_name: '张三',
      id: 'membership-1',
      username: 'zhangsan',
      version: 7,
    });
    await flush();

    expect(state.selectionProps.open).toBe(true);
    expect(state.selectionProps.telemetry).toEqual({
      eventName: 'tenant.member:assign-role',
      resourceId: 'membership-1',
    });
    await state.selectionProps.load(new AbortController().signal);
    await state.selectionProps.save(['role-1', 'role-2']);
    expect(state.loadMemberRoles).toHaveBeenCalledWith(
      'membership-1',
      expect.any(AbortSignal),
    );
    expect(state.saveMemberRoles).toHaveBeenCalledWith(
      { id: 'membership-1', version: 7 },
      ['role-1', 'role-2'],
    );
  });

  it('opens effective permissions with a display name instead of an opaque member ID', async () => {
    await mount(MembersPage);
    const action = state.flatContract.table.rowActions.find(
      (item) => item.key === 'effective-permissions',
    );
    await action.run({
      display_name: '张三',
      id: 'membership-1',
      username: 'zhangsan',
    });
    await flush();

    expect(state.effectiveProps.open).toBe(true);
    expect(state.effectiveProps.member).toEqual({
      id: 'membership-1',
      name: '张三',
    });
  });

  it('binds role grants to the selected optimistic version and reloads after save', async () => {
    await mount(RolesPage);
    const action = state.flatContract.table.rowActions.find(
      (item) => item.key === 'grant',
    );
    expect(action.rowAuthorization).toBe(true);
    await action.run({ id: 'role-1', name: '部门管理员', version: 4 });
    await flush();

    const signal = new AbortController().signal;
    await state.selectionProps.load(signal);
    await state.selectionProps.save(['permission-1']);
    expect(state.loadRolePermissions).toHaveBeenCalledWith('role-1', signal);
    expect(state.saveRolePermissions).toHaveBeenCalledWith(
      { id: 'role-1', version: 4 },
      ['permission-1'],
    );
    state.selectionProps.onSaved();
    await flush();
    expect(state.reload).toHaveBeenCalled();
  });
});
