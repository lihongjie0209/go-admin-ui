/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- focused Ant Design behavior stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SecretRevealModal from '../../src/components/business/GoSecretRevealModal.vue';

const state = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  writeText: vi.fn(),
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
      props: ['disabled'],
      emits: ['click'],
      setup:
        (props, { emit, slots }) =>
        () =>
          h(
            'button',
            {
              disabled: props.disabled,
              onClick: () => emit('click'),
            },
            slots.default?.(),
          ),
    }),
    Input: {
      Password: defineComponent({
        props: ['value'],
        setup: (props) => () => h('input', { value: props.value }),
      }),
    },
    Modal: defineComponent({
      props: ['open'],
      emits: ['cancel'],
      setup:
        (props, { slots }) =>
        () =>
          props.open
            ? h('section', [slots.default?.(), slots.footer?.()])
            : null,
    }),
    Space: Box,
    message: { success: state.success, warning: state.warning },
  };
});

let app;
let root;

async function flush() {
  for (let index = 0; index < 6; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

beforeEach(() => {
  state.success.mockReset();
  state.warning.mockReset();
  state.writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: state.writeText },
  });
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('go secret reveal modal', () => {
  it('requires copying the one-time secret before closing', async () => {
    const updates = vi.fn();
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () =>
        h(SecretRevealModal, {
          'onUpdate:open': updates,
          open: true,
          secret: 'secret-once',
        }),
    });
    app.mount(root);
    await flush();

    const buttons = () => [...root.querySelectorAll('button')];
    expect(
      buttons().find((item) => item.textContent.includes('我已安全保存'))
        .disabled,
    ).toBe(true);
    buttons()
      .find((item) => item.textContent.includes('复制密钥'))
      .click();
    await flush();

    expect(state.writeText).toHaveBeenCalledWith('secret-once');
    expect(state.success).toHaveBeenCalledWith('密钥已复制');
    expect(
      buttons().find((item) => item.textContent.includes('我已安全保存'))
        .disabled,
    ).toBe(false);
    buttons()
      .find((item) => item.textContent.includes('我已安全保存'))
      .click();
    expect(updates).toHaveBeenCalledWith(false);
  });
});
