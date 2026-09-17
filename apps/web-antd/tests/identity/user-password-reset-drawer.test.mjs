/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- focused Ant Design behavior stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Drawer from '../../src/components/business/identity/UserPasswordResetDrawer.vue';
import CapabilityProvider from '../../src/components/foundation/GoCapabilityProvider.vue';

const state = vi.hoisted(() => ({
  evaluate: vi.fn(),
  reset: vi.fn(),
  success: vi.fn(),
  track: vi.fn(),
}));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  evaluateCapabilities: state.evaluate,
  trackFrontendAction: state.track,
}));
vi.mock('#/modules/identity/user-security-actions', () => ({
  resetUserPassword: state.reset,
  validateResetPassword: (password, confirmation) => {
    const errors = {};
    if (new TextEncoder().encode(password).length < 12)
      errors.password = '密码长度必须为 12 至 1024 字节';
    if (password !== confirmation) errors.confirmation = '两次输入的密码不一致';
    return errors;
  },
}));
vi.mock('ant-design-vue', () => {
  const Box = defineComponent({
    inheritAttrs: false,
    setup:
      (_, { attrs, slots }) =>
      () =>
        h('div', [
          attrs.message,
          attrs.description,
          attrs.help,
          slots.default?.(),
        ]),
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
  const Password = defineComponent({
    inheritAttrs: false,
    props: ['value'],
    emits: ['update:value'],
    setup:
      (props, { attrs, emit }) =>
      () =>
        h('input', {
          ...attrs,
          type: 'password',
          value: props.value,
          onInput: (event) => emit('update:value', event.target.value),
        }),
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
    Form: Box,
    FormItem: Box,
    Input: { Password },
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
    message: { success: state.success },
  };
});

const capability = {
  action: 'reset-password',
  key: 'identity.user:reset-password',
  resource: 'identity.user',
};
const user = { displayName: 'Alice', id: 'user-1', username: 'alice' };

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
        { default: () => h(Drawer, { open: true, user }) },
      ),
  });
  app.mount(root);
  await flush();
}

function fill(label, value) {
  const input = root.querySelector(`[aria-label="${label}"]`);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

beforeEach(() => {
  for (const mock of Object.values(state)) mock.mockReset();
  state.reset.mockResolvedValue(undefined);
  state.track.mockImplementation(async (_event, operation) => operation());
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('user password reset drawer', () => {
  it('validates locally without sending a secret or telemetry event', async () => {
    await mount();
    fill('新密码', 'short');
    fill('确认新密码', 'different');
    root.querySelector('[data-confirm]').click();
    await flush();

    expect(root.textContent).toContain('密码长度必须为 12 至 1024 字节');
    expect(root.textContent).toContain('两次输入的密码不一致');
    expect(state.reset).not.toHaveBeenCalled();
    expect(state.track).not.toHaveBeenCalled();
  });

  it('resets the selected user, records only its ID, and clears both password fields', async () => {
    await mount();
    fill('新密码', 'Temporary-Password-123!');
    fill('确认新密码', 'Temporary-Password-123!');
    root.querySelector('[data-confirm]').click();
    await flush();

    expect(state.reset).toHaveBeenCalledWith(
      'user-1',
      'Temporary-Password-123!',
    );
    expect(state.track).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'identity.user:reset-password',
        resource_id: 'user-1',
      }),
      expect.any(Function),
    );
    expect(state.track.mock.calls[0][0]).not.toHaveProperty('password');
    expect(state.success).toHaveBeenCalledWith(
      '密码已重置，用户现有会话已撤销',
    );
    expect(
      [...root.querySelectorAll('input')].every((input) => input.value === ''),
    ).toBe(true);
  });

  it('fails closed before calling reset when the capability is denied', async () => {
    await mount(false);
    expect(root.textContent).toContain('当前账号没有重置用户密码的权限');
    const reset = [...root.querySelectorAll('button')].find((button) =>
      button.textContent.includes('重置密码'),
    );
    expect(reset.disabled).toBe(true);
    expect(state.reset).not.toHaveBeenCalled();
  });
});
