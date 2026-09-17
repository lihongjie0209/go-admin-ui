import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, expect, it, vi } from 'vitest';

import DocumentDrawer from '../../src/components/business/policy/PolicyDocumentDrawer.vue';
import SimulationDrawer from '../../src/components/business/policy/PolicySimulationDrawer.vue';

vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  const passthrough = defineComponent({
    setup(_, { slots }) {
      return () =>
        h('div', [slots.default?.(), slots.footer?.(), slots.action?.()]);
    },
  });
  const Button = defineComponent({
    emits: ['click'],
    setup(_, { emit, slots }) {
      return () =>
        h('button', { onClick: () => emit('click') }, slots.default?.());
    },
  });
  const Alert = defineComponent({
    props: ['message'],
    setup(props) {
      return () => h('p', props.message);
    },
  });
  const TextArea = defineComponent({
    props: ['readonly', 'value'],
    emits: ['update:value'],
    setup(props, { emit }) {
      return () =>
        h('textarea', {
          readonly: props.readonly,
          value: props.value,
          onInput: (event) => emit('update:value', event.target.value),
        });
    },
  });
  return {
    Alert,
    Button,
    Drawer: passthrough,
    Form: passthrough,
    FormItem: passthrough,
    Input: { TextArea },
    Space: passthrough,
  };
});

let app;
let root;

async function flush() {
  for (let index = 0; index < 8; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

function button(label) {
  return [...root.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === label,
  );
}

function input(textarea, value) {
  textarea.value = value;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

async function mount(component, props) {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({ setup: () => () => h(component, props) });
  app.mount(root);
  await flush();
}

afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  root = undefined;
});

it('策略文档抽屉在客户端拦截错误 YAML，并只保存合法对象', async () => {
  const save = vi.fn().mockResolvedValue({ id: 'version-id' });
  const props = reactive({
    initialDocument: 'spec: {}',
    open: true,
    save,
    title: '创建策略草稿',
  });
  await mount(DocumentDrawer, props);

  input(root.querySelector('textarea'), 'spec: [');
  button('保存草稿').click();
  await flush();
  expect(save).not.toHaveBeenCalled();
  expect(root.textContent).toContain('Flow sequence in block collection');

  input(root.querySelector('textarea'), 'spec:\n  effect: allow');
  button('保存草稿').click();
  await flush();
  expect(save).toHaveBeenCalledWith('spec:\n  effect: allow');
});

it('策略模拟抽屉拒绝非对象 JSON，并展示服务端求值结果', async () => {
  const run = vi.fn().mockResolvedValue({ allowed: true, reason: 'matched' });
  await mount(SimulationDrawer, {
    initialInput: { action: 'read' },
    open: true,
    run,
    title: '模拟策略求值',
  });

  input(root.querySelector('textarea'), '[]');
  button('运行模拟').click();
  await flush();
  expect(run).not.toHaveBeenCalled();
  expect(root.textContent).toContain('模拟输入必须是 JSON 对象');

  input(root.querySelector('textarea'), '{"action":"update"}');
  button('运行模拟').click();
  await flush();
  expect(run).toHaveBeenCalledWith(
    { action: 'update' },
    expect.any(AbortSignal),
  );
  expect(root.querySelectorAll('textarea')[1].value).toContain(
    '"allowed": true',
  );
});

it('关闭模拟抽屉会取消运行中的请求且不回写晚到结果', async () => {
  let resolve;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const run = vi.fn().mockReturnValue(pending);
  const props = reactive({
    initialInput: { action: 'read' },
    open: true,
    run,
    title: '模拟策略求值',
  });
  await mount(SimulationDrawer, props);

  button('运行模拟').click();
  await flush();
  const signal = run.mock.calls[0][1];
  expect(signal.aborted).toBe(false);

  props.open = false;
  await flush();
  expect(signal.aborted).toBe(true);
  resolve({ allowed: true });
  await flush();
  expect(root.querySelectorAll('textarea')).toHaveLength(1);
});
