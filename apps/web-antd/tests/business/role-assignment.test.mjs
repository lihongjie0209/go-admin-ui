import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Drawer from '../../src/components/business/GoRoleAssignmentDrawer.vue';
const api = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('ant-design-vue', async () => {
  const { defineComponent, h, provide, inject } = await import('vue');
  const box = defineComponent({
    setup: (_, c) => () => h('div', c.slots.default?.()),
  });
  const Checkbox = defineComponent({
    props: ['value', 'disabled'],
    setup: (p, c) => {
      const group = inject('roles');
      return () =>
        h('label', [
          h('input', {
            type: 'checkbox',
            disabled: p.disabled,
            checked: group.values().includes(p.value),
            onChange: (e) => group.toggle(p.value, e.target.checked),
          }),
          c.slots.default?.(),
        ]);
    },
  });
  Checkbox.Group = defineComponent({
    props: ['value'],
    emits: ['update:value'],
    setup: (p, c) => {
      provide('roles', {
        values: () => p.value,
        toggle: (id, checked) =>
          c.emit(
            'update:value',
            checked ? [...p.value, id] : p.value.filter((v) => v !== id),
          ),
      });
      return () => h('div', c.slots.default?.());
    },
  });
  return {
    Checkbox,
    Spin: box,
    Empty: box,
    message: api,
    Input: {
      Search: defineComponent({
        props: ['value'],
        emits: ['update:value'],
        setup: (p, c) => () =>
          h('input', {
            type: 'search',
            value: p.value,
            onInput: (e) => c.emit('update:value', e.target.value),
          }),
      }),
    },
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
    Drawer: defineComponent({
      props: ['open'],
      setup: (p, c) => () =>
        p.open ? h('section', [c.slots.default?.(), c.slots.footer?.()]) : null,
    }),
  };
});
const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await nextTick();
  }
};
const deferred = () => {
  let reject, resolve;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
let app, props, root, saved;
async function mount(overrides = {}) {
  props = reactive({
    open: true,
    subjectId: 'user-a',
    subjectName: '同名用户',
    loadOptions: vi.fn().mockResolvedValue([
      { id: 'one', label: '管理员', description: '维护配置' },
      { id: 'two', label: '审计员' },
    ]),
    loadSelected: vi.fn().mockResolvedValue(['one']),
    save: vi.fn().mockResolvedValue(),
    ...overrides,
  });
  saved = vi.fn();
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({
    setup: () => () =>
      h(Drawer, {
        ...props,
        onSaved: saved,
        'onUpdate:open': (v) => (props.open = v),
      }),
  });
  app.mount(root);
  await flush();
}
function button(text) {
  const el = [...root.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === text,
  );
  if (!el) throw new Error(`button ${text} not found in ${root.innerHTML}`);
  return el;
}
beforeEach(() => {
  api.success.mockReset();
  api.error.mockReset();
});
afterEach(() => {
  app?.unmount();
  app = undefined;
  root?.remove();
});

it('首次打开加载候选和已分配角色，搜索保留勾选，显式确认提交快照且不重复', async () => {
  const pending = deferred();
  await mount({ save: vi.fn().mockReturnValue(pending.promise) });
  expect(props.loadOptions).toHaveBeenCalledTimes(1);
  expect(props.save).not.toHaveBeenCalled();
  expect(root.querySelector('input[type=checkbox]').checked).toBe(true);
  const search = root.querySelector('input[type=search]');
  search.value = '审计';
  search.dispatchEvent(new Event('input'));
  await flush();
  expect(root.querySelectorAll('input[type=checkbox]')).toHaveLength(1);
  root.querySelector('input[type=checkbox]').click();
  await flush();
  button('保存').click();
  button('保存').click();
  await flush();
  expect(props.save).toHaveBeenCalledTimes(1);
  expect(props.save).toHaveBeenCalledWith(['one', 'two']);
  pending.resolve();
  await flush();
  expect(saved).toHaveBeenCalledTimes(1);
  expect(props.open).toBe(false);
});
it('读取失败禁止提交，重新加载恢复且保存失败保留选择', async () => {
  await mount({
    loadSelected: vi
      .fn()
      .mockRejectedValueOnce(new Error('读取失败'))
      .mockResolvedValue(['one']),
    save: vi.fn().mockRejectedValue(new Error('版本冲突')),
  });
  expect(api.error).toHaveBeenCalledWith('读取失败');
  expect(button('保存').disabled).toBe(true);
  button('保存').click();
  expect(props.save).not.toHaveBeenCalled();
  button('重新加载').click();
  await flush();
  button('保存').click();
  await flush();
  expect(api.error).toHaveBeenCalledWith('版本冲突');
  expect(props.open).toBe(true);
  expect(root.querySelector('input[type=checkbox]').checked).toBe(true);
  expect(saved).not.toHaveBeenCalled();
});
it('只读隐藏保存，取消不写入', async () => {
  await mount({ readonly: true });
  expect(
    [...root.querySelectorAll('button')].some(
      (b) => b.textContent?.trim() === '保存',
    ),
  ).toBe(false);
  expect(root.querySelector('input[type=checkbox]').disabled).toBe(true);
  button('取消').click();
  await flush();
  expect(props.open).toBe(false);
  expect(props.save).not.toHaveBeenCalled();
});
it('保存按钮已显示时变为只读，提交入口仍拒绝写入', async () => {
  await mount();
  const oldButton = button('保存');
  props.readonly = true;
  await flush();
  oldButton.click();
  await flush();
  expect(props.save).not.toHaveBeenCalled();
});
it.each(['success', 'failure'])(
  '关闭后旧加载 %s 不更新或提示，重新打开重新读取',
  async (outcome) => {
    const old = deferred();
    await mount({
      loadOptions: vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockResolvedValue([{ id: 'new', label: '重开角色' }]),
    });
    props.open = false;
    await flush();
    if (outcome === 'success') old.resolve([{ id: 'old', label: '旧候选' }]);
    else old.reject(new Error('旧错误'));
    await flush();
    expect(api.error).not.toHaveBeenCalled();
    props.open = true;
    await flush();
    expect(root.textContent).toContain('重开角色');
    expect(root.textContent).not.toContain('旧候选');
  },
);
it.each(['success', 'failure'])(
  '同名用户 ID 切换后忽略旧加载 %s',
  async (outcome) => {
    const old = deferred();
    await mount({
      loadOptions: vi
        .fn()
        .mockReturnValueOnce(old.promise)
        .mockResolvedValue([{ id: 'new', label: '新用户角色' }]),
    });
    props.subjectId = 'user-b';
    await flush();
    if (outcome === 'success')
      old.resolve([{ id: 'old', label: '旧用户角色' }]);
    else old.reject(new Error('旧用户错误'));
    await flush();
    expect(root.textContent).toContain('新用户角色');
    expect(root.textContent).not.toContain('旧用户角色');
    expect(api.error).not.toHaveBeenCalled();
  },
);
it.each(['success', 'failure'])(
  '保存期间切换用户，旧响应 %s 不关闭新抽屉',
  async (outcome) => {
    const old = deferred();
    await mount({ save: vi.fn().mockReturnValue(old.promise) });
    button('保存').click();
    await flush();
    props.subjectId = 'user-b';
    await flush();
    if (outcome === 'success') old.resolve();
    else old.reject(new Error('旧保存错误'));
    await flush();
    expect(props.open).toBe(true);
    expect(saved).not.toHaveBeenCalled();
    expect(api.success).not.toHaveBeenCalled();
    expect(api.error).not.toHaveBeenCalled();
    expect(button('保存').disabled).toBe(false);
  },
);
it('卸载后保存成功不提示或发出事件', async () => {
  const old = deferred();
  await mount({ save: vi.fn().mockReturnValue(old.promise) });
  button('保存').click();
  await flush();
  app.unmount();
  app = undefined;
  old.resolve();
  await flush();
  expect(saved).not.toHaveBeenCalled();
  expect(api.success).not.toHaveBeenCalled();
});
