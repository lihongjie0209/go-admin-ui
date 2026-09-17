/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- behavioral Ant Design stubs intentionally live beside the mounted integration test */
import { createApp, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ResourceEditor from '../../src/components/business/GoResourceEditor.vue';
import CapabilityProvider from '../../src/components/foundation/GoCapabilityProvider.vue';

const state = vi.hoisted(() => ({
  evaluate: vi.fn(),
  messageSuccess: vi.fn(),
  modalConfirm: vi.fn(),
}));

vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  const passthrough = (tag = 'div') =>
    defineComponent({
      inheritAttrs: false,
      setup(_, { attrs, slots }) {
        return () => h(tag, attrs, slots.default?.());
      },
    });
  const Input = defineComponent({
    inheritAttrs: false,
    props: ['value'],
    emits: ['update:value'],
    setup(props, { attrs, emit }) {
      return () =>
        h('input', {
          ...attrs,
          value: props.value ?? '',
          onInput: (event) => emit('update:value', event.target.value),
        });
    },
  });
  Input.TextArea = Input;
  Input.Password = Input;
  return {
    Alert: defineComponent({
      props: ['message'],
      setup(props, { slots }) {
        return () => h('section', [props.message, slots.description?.()]);
      },
    }),
    Button: passthrough('button'),
    DatePicker: Input,
    Drawer: defineComponent({
      props: ['open'],
      emits: ['close'],
      setup(props, { emit, slots }) {
        return () =>
          props.open
            ? h('aside', [
                slots.default?.(),
                slots.footer?.(),
                h(
                  'button',
                  { 'data-drawer-close': true, onClick: () => emit('close') },
                  'x',
                ),
              ])
            : null;
      },
    }),
    Form: passthrough('form'),
    FormItem: defineComponent({
      props: ['help', 'label'],
      setup(props, { slots }) {
        return () =>
          h('label', [
            h('span', props.label),
            slots.default?.(),
            props.help ? h('small', { 'data-error': true }, props.help) : null,
          ]);
      },
    }),
    Input,
    InputNumber: Input,
    Modal: { confirm: state.modalConfirm },
    Select: Input,
    Space: passthrough('div'),
    Switch: Input,
    message: { success: state.messageSuccess },
  };
});

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  evaluateCapabilities: state.evaluate,
}));

vi.mock('../../src/components/foundation/GoDictionarySelect.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return { default: defineComponent(() => () => h('select')) };
});
vi.mock(
  '../../src/components/foundation/GoDictionaryTreeSelect.vue',
  async () => {
    const { defineComponent, h } = await import('vue');
    return { default: defineComponent(() => () => h('select')) };
  },
);
vi.mock('../../src/components/business/GoIconPicker.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return { default: defineComponent(() => () => h('button', 'icon-picker')) };
});

const capabilities = ['create', 'update'].map((action) => ({
  action,
  key: `tenant.member:${action}`,
  resource: 'tenant.member',
}));
const fields = [{ field: 'name', label: '名称', required: true }];

let app;
let editor;
let root;

async function flush() {
  for (let index = 0; index < 8; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount(props) {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({
    setup: () => () =>
      h(
        CapabilityProvider,
        { capabilities },
        {
          default: () =>
            h(ResourceEditor, {
              authorizationResource: 'tenant.member',
              fields,
              open: true,
              ref: (value) => (editor = value),
              ...props,
            }),
        },
      ),
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  state.evaluate.mockReset();
  state.messageSuccess.mockReset();
  state.modalConfirm.mockReset();
  state.evaluate.mockResolvedValue({
    items: capabilities.map(({ key }) => ({ allowed: true, key })),
    revision: 'policy-1',
  });
});

afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  editor = undefined;
  root = undefined;
});

describe('go resource editor integration', () => {
  it('submits an immutable edit snapshot once and closes after success', async () => {
    let complete;
    const submit = vi.fn(() => new Promise((resolve) => (complete = resolve)));
    await mount({
      mode: 'edit',
      record: { id: 'member-1', name: 'Old', version: 7 },
      submit,
    });

    const input = root.querySelector('input');
    input.value = 'New';
    input.dispatchEvent(new Event('input'));
    await nextTick();
    const save = [...root.querySelectorAll('button')].find((button) =>
      button.textContent.includes('保存'),
    );
    save.click();
    save.click();
    await flush();

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(
      { name: 'New' },
      { id: 'member-1', name: 'Old', version: 7 },
    );
    complete({ id: 'member-1', version: 8 });
    await flush();
    expect(state.messageSuccess).toHaveBeenCalledWith('修改成功');
  });

  it('blocks invalid requests and displays server field errors with request ID', async () => {
    const submit = vi.fn().mockRejectedValueOnce({
      response: {
        data: {
          body: { field_errors: { name: '名称重复' } },
          code: 30_011,
          message: '版本冲突',
          request_id: 'req-editor-1',
        },
      },
    });
    await mount({
      mode: 'edit',
      record: { id: '1', name: '', version: 1 },
      submit,
    });

    await editor.save();
    expect(submit).not.toHaveBeenCalled();
    expect(root.textContent).toContain('请填写名称');

    editor.values.name = 'Duplicate';
    await editor.save();
    await flush();
    expect(root.textContent).toContain('数据已被其他人修改');
    expect(root.textContent).toContain('请求 ID：req-editor-1');
    expect(root.textContent).toContain('名称重复');
  });

  it('guards dirty close and keeps detail mode read-only', async () => {
    const beforeDiscard = vi.fn().mockResolvedValue(false);
    await mount({
      beforeDiscard,
      mode: 'edit',
      record: { id: '1', name: 'Old', version: 1 },
      submit: vi.fn(),
    });
    editor.values.name = 'Changed';
    await editor.requestClose();
    expect(beforeDiscard).toHaveBeenCalledTimes(1);

    app.unmount();
    root.remove();
    app = undefined;
    root = undefined;
    await mount({
      mode: 'detail',
      record: { id: '1', name: 'Old', version: 1 },
      submit: vi.fn(),
    });
    expect(root.textContent).not.toContain('保存');
  });

  it('loads dependent select options and clears a stale child selection', async () => {
    const loadResources = vi.fn().mockResolvedValue([
      { label: '租户成员', value: 'tenant.member' },
      { label: '应用', value: 'application' },
    ]);
    const loadActions = vi.fn(async (values) =>
      values.resource === 'application'
        ? [{ label: '列表', value: 'list' }]
        : [{ label: '更新', value: 'update' }],
    );
    await mount({
      fields: [
        {
          component: 'select',
          field: 'resource',
          label: '资源',
          optionLoader: loadResources,
        },
        {
          clearOnDependencyChange: true,
          component: 'select',
          field: 'action',
          label: '动作',
          optionLoader: loadActions,
          optionsDependsOn: ['resource'],
        },
      ],
      mode: 'edit',
      record: {
        action: 'update',
        id: '1',
        resource: 'tenant.member',
        version: 1,
      },
      submit: vi.fn(),
    });

    expect(loadResources).toHaveBeenCalledTimes(1);
    expect(loadActions).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'tenant.member' }),
      expect.any(AbortSignal),
    );
    expect(editor.values.action).toBe('update');

    editor.values.resource = 'application';
    await flush();

    expect(loadActions).toHaveBeenLastCalledWith(
      expect.objectContaining({ resource: 'application' }),
      expect.any(AbortSignal),
    );
    expect(editor.values.action).toBeUndefined();
  });
});
