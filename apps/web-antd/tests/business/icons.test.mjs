import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Icon from '../../src/components/business/GoIcon.vue';
import Picker from '../../src/components/business/GoIconPicker.vue';
const api = vi.hoisted(() => ({
  load: vi.fn(),
  register: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../../src/components/business/offline-icon-collections', () => ({
  loadOfflineIconCollections: api.load,
}));
vi.mock('@vben/icons', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    addCollection: api.register,
    IconifyIcon: defineComponent({
      props: ['icon'],
      setup: (p) => () => h('span', { 'data-icon': p.icon }),
    }),
  };
});
vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    message: { error: api.error },
    Spin: defineComponent({
      setup: (_, c) => () => h('div', c.slots.default?.()),
    }),
    Button: defineComponent({
      props: ['disabled', 'loading'],
      emits: ['click'],
      setup: (p, c) => () =>
        h(
          'button',
          { disabled: p.disabled || p.loading, onClick: () => c.emit('click') },
          c.slots.default?.(),
        ),
    }),
    Input: defineComponent({
      props: ['value'],
      emits: ['update:value'],
      setup: (p, c) => () =>
        h('input', {
          value: p.value,
          onInput: (e) => c.emit('update:value', e.target.value),
        }),
    }),
    Modal: defineComponent({
      props: ['open'],
      emits: ['update:open'],
      setup: (p, c) => () =>
        p.open
          ? h('section', [
              c.slots.default?.(),
              h(
                'button',
                { onClick: () => c.emit('update:open', false) },
                '关闭',
              ),
            ])
          : null,
    }),
    Pagination: defineComponent({
      props: ['current'],
      emits: ['update:current'],
      setup: (p, c) => () =>
        h(
          'button',
          { onClick: () => c.emit('update:current', p.current + 1) },
          '下一页',
        ),
    }),
  };
});
const collections = [
  {
    prefix: 'lucide',
    icons: Object.fromEntries(
      Array.from({ length: 82 }, (_, i) => [`item-${i}`, { body: '<path />' }]),
    ),
  },
  { prefix: 'carbon', icons: { user: { body: '<path />' } } },
];
let app, props, root, updates;
const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await nextTick();
  }
};
async function mount(component = Picker, values = {}) {
  props = reactive(values);
  updates = vi.fn((value) => {
    props.modelValue = value;
  });
  root = document.createElement('div');
  app = createApp({
    render: () => h(component, { ...props, 'onUpdate:modelValue': updates }),
  });
  app.mount(root);
  await flush();
}
async function click(text) {
  const el = [...root.querySelectorAll('button')].find(
    (b) => b.textContent === text,
  );
  expect(el).toBeTruthy();
  el.click();
  await flush();
}
beforeEach(() => {
  api.load.mockReset();
  api.register.mockReset();
  api.error.mockReset();
  api.load.mockResolvedValue(collections);
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  root?.remove();
});
it('图标展示转发尺寸与可访问属性，空值明确回退', async () => {
  await mount(Icon, { icon: null });
  expect(root.textContent).toBe('—');
  props.icon = 'lucide:user';
  props.size = 24;
  await flush();
  const icon = root.querySelector('[data-icon]');
  expect(icon.dataset.icon).toBe('lucide:user');
  expect(icon.style.fontSize).toBe('24px');
  expect(icon.getAttribute('aria-hidden')).toBe('true');
  props.icon = '';
  await flush();
  expect(root.textContent).toBe('—');
  expect(api.load).not.toHaveBeenCalled();
});
it('离线候选按需加载、分页与搜索复位；选择更新值、重开复用已加载集合', async () => {
  await mount();
  expect(api.load).not.toHaveBeenCalled();
  await click('选择图标');
  expect(api.register).toHaveBeenCalledTimes(2);
  expect(root.querySelectorAll('.icon-option')).toHaveLength(80);
  await click('下一页');
  expect(root.querySelectorAll('.icon-option')).toHaveLength(3);
  const input = root.querySelector('input');
  input.value = ' USER ';
  input.dispatchEvent(new Event('input'));
  await flush();
  expect(root.querySelectorAll('.icon-option')).toHaveLength(1);
  root.querySelector('.icon-option').click();
  await flush();
  expect(updates).toHaveBeenCalledWith('carbon:user');
  expect(root.querySelector('section')).toBeNull();
  await click('选择图标');
  expect(api.load).toHaveBeenCalledTimes(1);
  await click('关闭');
  await click('清空');
  expect(updates).toHaveBeenLastCalledWith('');
});
it('取消不修改值，打开后禁用会关闭选择框并禁止再次打开', async () => {
  await mount(Picker, { modelValue: 'lucide:item-0' });
  await click('选择图标');
  await click('关闭');
  expect(updates).not.toHaveBeenCalled();
  await click('选择图标');
  props.disabled = true;
  await flush();
  expect(root.querySelector('section')).toBeNull();
  await click('选择图标');
  await click('清空');
  expect(updates).not.toHaveBeenCalled();
});
it('资源加载失败可重试，不能吞掉错误或写入选中值', async () => {
  api.load.mockRejectedValueOnce(new Error('chunk failed'));
  await mount();
  await click('选择图标');
  expect(api.error).toHaveBeenCalledWith(
    '本地图标加载失败，请重新打开选择框重试',
  );
  expect(updates).not.toHaveBeenCalled();
  await click('关闭');
  await click('选择图标');
  expect(api.load).toHaveBeenCalledTimes(2);
  expect(root.querySelectorAll('.icon-option')).toHaveLength(80);
});
it('卸载后的加载结果不注册集合，重复打开不重复加载', async () => {
  let resolve;
  api.load.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  await mount();
  await click('选择图标');
  await click('选择图标');
  expect(api.load).toHaveBeenCalledTimes(1);
  app.unmount();
  app = undefined;
  resolve(collections);
  await flush();
  expect(api.register).not.toHaveBeenCalled();
  expect(api.error).not.toHaveBeenCalled();
});
