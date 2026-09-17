/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- focused Ant Design behavior stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Drawer from '../../src/components/business/tenant/DepartmentMemberAssignmentDrawer.vue';
import CapabilityProvider from '../../src/components/foundation/GoCapabilityProvider.vue';

const state = vi.hoisted(() => ({
  evaluate: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  success: vi.fn(),
  track: vi.fn(),
}));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  evaluateCapabilities: state.evaluate,
  trackFrontendAction: state.track,
}));
vi.mock('#/modules/tenant/department-member-assignment', () => ({
  loadDepartmentMemberAssignment: state.load,
  saveDepartmentMemberAssignment: state.save,
}));
vi.mock('ant-design-vue', () => {
  const Box = defineComponent({
    inheritAttrs: false,
    setup:
      (_, { attrs, slots }) =>
      () =>
        h('div', [attrs.message, slots.default?.(), slots.action?.()]),
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
    inheritAttrs: false,
    props: ['value'],
    emits: ['update:value'],
    setup:
      (props, { attrs, emit }) =>
      () =>
        h('input', {
          ...attrs,
          'data-search': true,
          value: props.value,
          onInput: (event) => emit('update:value', event.target.value),
        }),
  });
  const Radio = defineComponent({
    props: ['checked', 'disabled'],
    emits: ['click'],
    setup:
      (props, { emit }) =>
      () =>
        h('button', {
          'data-primary': true,
          disabled: props.disabled,
          onClick: () => emit('click'),
        }),
  });
  const Table = defineComponent({
    props: ['dataSource', 'rowSelection'],
    setup:
      (props, { slots }) =>
      () =>
        h('section', [
          h(
            'button',
            {
              'data-select-active': true,
              onClick: () => props.rowSelection.onChange(['membership-1']),
            },
            '选择启用成员',
          ),
          ...props.dataSource.map((record) =>
            h('article', { 'data-member': record.id }, [
              h('span', record.username),
              slots.bodyCell?.({
                column: { dataIndex: 'primary' },
                record,
              }),
            ]),
          ),
        ]),
  });
  return {
    Alert: Box,
    Button,
    Drawer: defineComponent({
      props: ['open'],
      setup:
        (props, { slots }) =>
        () =>
          props.open ? h('aside', [slots.default?.(), slots.footer?.()]) : null,
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
    Radio,
    Space: Box,
    Table,
    Tag: Box,
    message: { error: vi.fn(), success: state.success },
  };
});
vi.mock('../../src/components/foundation/GoDateTimeText.vue', () => ({
  default: defineComponent({ setup: () => () => h('time') }),
}));

const capability = {
  action: 'assign-member',
  key: 'tenant.department:assign-member',
  resource: 'tenant.department',
};
const department = {
  children: [],
  id: 'department-1',
  name: '研发部',
  parent_id: null,
  sort_order: 10,
  version: 3,
};
const active = {
  display_name: '张三',
  id: 'membership-1',
  joined_at: '2026-09-18T09:00:00+08:00',
  status: 'active',
  user_id: 'user-1',
  username: 'zhangsan',
};
const disabled = {
  display_name: '李四',
  id: 'membership-2',
  joined_at: '2026-09-18T09:10:00+08:00',
  status: 'disabled',
  user_id: 'user-2',
  username: 'lisi',
};

let app;
let root;

async function flush() {
  for (let index = 0; index < 10; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount(allowed = true) {
  state.evaluate.mockResolvedValue({
    items: [{ allowed, key: capability.key }],
  });
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({
    setup: () => () =>
      h(
        CapabilityProvider,
        { capabilities: [capability] },
        { default: () => h(Drawer, { department, open: true }) },
      ),
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  for (const mock of Object.values(state)) mock.mockReset();
  state.load.mockResolvedValue({
    assigned: [
      { ...active, is_primary: false, membership_id: active.id },
      { ...disabled, is_primary: true, membership_id: disabled.id },
    ],
    candidates: [active, disabled],
  });
  state.save.mockResolvedValue(undefined);
  state.track.mockImplementation(async (_event, operation) => operation());
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('department member assignment drawer', () => {
  it('loads only after authorization and warns that disabled assignments will be removed', async () => {
    await mount();

    expect(state.load).toHaveBeenCalledWith(
      'department-1',
      expect.any(AbortSignal),
    );
    expect(root.textContent).toContain(
      '1 名停用成员不会保留在本部门，请确认后保存。',
    );
    expect(root.querySelector('[data-member="membership-1"]')).not.toBeNull();
    expect(root.querySelector('[data-member="membership-2"]')).not.toBeNull();
    expect(root.querySelector('[data-search]').getAttribute('aria-label')).toBe(
      '搜索部门成员',
    );
  });

  it('saves active selections with an optional primary member and operation telemetry', async () => {
    await mount();
    root.querySelector('[data-select-active]').click();
    await flush();
    root.querySelector('[data-member="membership-1"] [data-primary]').click();
    root.querySelector('[data-confirm]').click();
    await flush();

    expect(state.save).toHaveBeenCalledWith({
      departmentID: 'department-1',
      membershipIDs: ['membership-1'],
      primaryMembershipID: 'membership-1',
    });
    expect(state.track).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'tenant.department:assign-member',
        resource_id: 'department-1',
      }),
      expect.any(Function),
    );
    expect(state.success).toHaveBeenCalledWith('部门成员已更新');
  });

  it('fails closed and never loads membership data when assignment is denied', async () => {
    await mount(false);
    expect(state.load).not.toHaveBeenCalled();
    expect(state.save).not.toHaveBeenCalled();
  });
});
