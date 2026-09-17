import { createApp, defineComponent, h, nextTick } from 'vue';

/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- behavioral Ant Design stubs belong to this integration test */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import ChangePassword from '../../src/views/_core/authentication/change-password.vue';

const api = vi.hoisted(() => ({
  invoke: vi.fn(),
  logout: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('#/api/request', () => ({ requestClient: { post: api.invoke } }));
vi.mock('#/store', () => ({ useAuthStore: () => ({ logout: api.logout }) }));
vi.mock('ant-design-vue', () => {
  const Field = defineComponent({
    props: ['value'],
    emits: ['update:value', 'pressEnter'],
    setup: (p, c) => () =>
      h('input', {
        value: p.value,
        onInput: (e) => c.emit('update:value', e.target.value),
        onKeyup: (e) => e.key === 'Enter' && c.emit('pressEnter'),
      }),
  });
  return {
    message: api,
    Card: defineComponent({
      setup: (_, c) => () => h('section', c.slots.default?.()),
    }),
    InputPassword: Field,
    Button: defineComponent({
      props: ['loading'],
      emits: ['click'],
      setup: (p, c) => () =>
        h(
          'button',
          { disabled: p.loading, onClick: () => c.emit('click') },
          c.slots.default?.(),
        ),
    }),
  };
});

let app, root;
const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await nextTick();
  }
};
const deferred = () => {
  let reject, resolve;
  const promise = new Promise((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
};
function fill(index, value) {
  const input = root.querySelectorAll('input')[index];
  input.value = value;
  input.dispatchEvent(new Event('input'));
}
async function submit() {
  root.querySelector('button').click();
  await flush();
}
beforeEach(() => {
  for (const mock of Object.values(api)) mock.mockReset();
  api.invoke.mockResolvedValue({});
  api.logout.mockResolvedValue();
  root = document.createElement('div');
  document.body.append(root);
  app = createApp(ChangePassword);
  app.mount(root);
});
afterEach(() => {
  app?.unmount();
  root?.remove();
});

it('在请求前校验长度和两次输入一致', async () => {
  fill(0, 'short');
  fill(1, 'short');
  await submit();
  expect(api.warning).toHaveBeenLastCalledWith('密码至少需要 12 个字符');
  expect(api.invoke).not.toHaveBeenCalled();
  fill(0, 'LongPassword1!');
  fill(1, 'DifferentPass1!');
  await submit();
  expect(api.warning).toHaveBeenLastCalledWith('两次输入的密码不一致');
  expect(api.invoke).not.toHaveBeenCalled();
});

it('确认后通过受控接口修改密码，成功才退出且防止重复提交', async () => {
  fill(0, 'LongPassword1!');
  fill(1, 'LongPassword1!');
  const pending = deferred();
  api.invoke.mockReturnValue(pending.promise);
  root.querySelector('button').click();
  root.querySelector('button').click();
  await flush();
  expect(api.invoke).toHaveBeenCalledExactlyOnceWith('/auth/password/change', {
    password: 'LongPassword1!',
  });
  expect(root.querySelector('button').disabled).toBe(true);
  expect(api.logout).not.toHaveBeenCalled();
  pending.resolve({});
  await flush();
  expect(api.success).toHaveBeenCalledWith('密码修改成功，请重新登录');
  expect(api.logout).toHaveBeenCalledTimes(1);
});

it('修改失败保留输入且不退出，允许用户重试', async () => {
  fill(0, 'LongPassword1!');
  fill(1, 'LongPassword1!');
  api.invoke.mockRejectedValueOnce(new Error('新密码不能与近期密码重复'));
  await submit();
  expect(api.error).toHaveBeenCalledWith('新密码不能与近期密码重复');
  expect(api.logout).not.toHaveBeenCalled();
  expect(root.querySelectorAll('input')[0].value).toBe('LongPassword1!');
  await submit();
  expect(api.invoke).toHaveBeenCalledTimes(2);
  expect(api.logout).toHaveBeenCalledTimes(1);
});
