import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, expect, it, vi } from 'vitest';

import Login from '../../src/views/_core/authentication/login.vue';

vi.mock('@vben/common-ui', () => ({
  AuthenticationLogin: defineComponent({
    props: {
      formSchema: { type: Array, required: true },
    },
    setup: (props) => () =>
      h(
        'form',
        props.formSchema.map((field) =>
          h('input', {
            ...field.componentProps,
            name: field.fieldName,
            type: field.component === 'VbenInputPassword' ? 'password' : 'text',
          }),
        ),
      ),
  }),
  z: {
    string: () => ({ min: () => ({}) }),
  },
}));
vi.mock('@vben/locales', () => ({
  $t: (key) =>
    key === 'authentication.password' ? '密码' : '请输入有效的密码',
}));
vi.mock('#/store', () => ({
  useAuthStore: () => ({
    authLogin: vi.fn(),
    loginLoading: false,
  }),
}));

let app;
let root;

afterEach(() => {
  app?.unmount();
  app = undefined;
  root?.remove();
  root = undefined;
});

it('exposes stable accessible names for both login fields', async () => {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp(Login);
  app.mount(root);
  await nextTick();

  const username = root.querySelector('input[name="username"]');
  const password = root.querySelector('input[name="password"]');
  expect(username?.getAttribute('aria-label')).toBe('用户名');
  expect(password?.getAttribute('aria-label')).toBe('密码');
  expect(password?.getAttribute('type')).toBe('password');
});
