import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import AuthenticationLogin from '../login.vue';

const validate = vi.fn();
const getValues = vi.fn();

vi.mock('@vben/locales', () => ({
  $t: (key: string) => (key === 'common.login' ? '登录' : key),
}));

vi.mock('@vben-core/form-ui', () => ({
  useVbenForm: () => [
    defineComponent({ render: () => h('form') }),
    {
      getValues,
      setFieldValue: vi.fn(),
      validate,
    },
  ],
}));

vi.mock('@vben-core/shadcn-ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vben-core/shadcn-ui')>()),
  VbenButton: defineComponent({
    inheritAttrs: false,
    setup:
      (_props, { attrs, slots }) =>
      () =>
        h('button', { ...attrs, type: 'button' }, slots.default?.()),
  }),
  VbenCheckbox: defineComponent({ render: () => h('input') }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('authentication login', () => {
  beforeEach(() => {
    localStorage.clear();
    validate.mockReset().mockResolvedValue({ valid: true });
    getValues.mockReset().mockResolvedValue({
      password: 'secret',
      username: 'admin',
    });
  });

  it('uses the localized visible submit text as its accessible name', () => {
    const wrapper = mount(AuthenticationLogin, {
      props: {
        formSchema: [],
        showCodeLogin: false,
        showForgetPassword: false,
        showQrcodeLogin: false,
        showRegister: false,
        showRememberMe: false,
        showThirdPartyLogin: false,
      },
      slots: {
        title: () => h('div'),
      },
    });

    const button = wrapper.get('button');
    expect(button.text()).toBe('登录');
    expect(button.attributes('aria-label')).toBeUndefined();
  });
});
