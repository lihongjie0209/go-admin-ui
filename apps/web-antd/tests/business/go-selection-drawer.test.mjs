/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- focused Ant Design behavior stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SelectionDrawer from '../../src/components/business/GoSelectionDrawer.vue';

const state = vi.hoisted(() => ({ success: vi.fn(), track: vi.fn() }));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  trackFrontendAction: state.track,
}));

vi.mock('ant-design-vue', () => {
  const Box = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('div', slots.default?.()),
  });
  return {
    Alert: Box,
    Button: defineComponent({
      emits: ['click'],
      setup:
        (_, { emit, slots }) =>
        () =>
          h('button', { onClick: () => emit('click') }, slots.default?.()),
    }),
    Drawer: defineComponent({
      props: ['open'],
      setup:
        (props, { slots }) =>
        () =>
          props.open
            ? h('section', [slots.default?.(), slots.footer?.()])
            : null,
    }),
    Empty: Box,
    Spin: Box,
    Transfer: defineComponent({
      emits: ['update:targetKeys'],
      setup:
        (_, { emit }) =>
        () =>
          h(
            'button',
            {
              'data-select-role': true,
              onClick: () => emit('update:targetKeys', ['role-2']),
            },
            'select',
          ),
    }),
    message: { error: vi.fn(), success: state.success },
  };
});

let app;
let root;
let load;
let save;

async function flush() {
  for (let index = 0; index < 8; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

beforeEach(() => {
  load = vi.fn().mockResolvedValue({
    items: [
      { id: 'role-1', name: '管理员' },
      { id: 'role-2', name: '审计员' },
    ],
    selected: ['role-1'],
  });
  save = vi.fn().mockResolvedValue(undefined);
  state.success.mockReset();
  state.track.mockReset();
  state.track.mockImplementation(async (_event, operation) => operation());
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('go selection drawer', () => {
  it('loads the current assignment and saves the changed selection', async () => {
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () =>
        h(SelectionDrawer, {
          load,
          open: true,
          save,
          telemetry: {
            eventName: 'tenant.member:assign-role',
            resourceId: 'membership-1',
          },
          title: '分配角色',
        }),
    });
    app.mount(root);
    await flush();

    expect(load).toHaveBeenCalledTimes(1);
    root.querySelector('[data-select-role]').click();
    const saveButton = [...root.querySelectorAll('button')].find((button) =>
      button.textContent.includes('保存分配'),
    );
    saveButton.click();
    await flush();

    expect(save).toHaveBeenCalledWith(['role-2']);
    expect(state.track).toHaveBeenCalledWith(
      {
        application_id: '',
        event_name: 'tenant.member:assign-role',
        page_route: '',
        resource_id: 'membership-1',
      },
      expect.any(Function),
    );
    expect(state.success).toHaveBeenCalledWith('分配已保存');
  });
});
