import { createApp, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TreeResource from '../../src/components/business/GoTreeResource.vue';
import CapabilityProvider from '../../src/components/foundation/GoCapabilityProvider.vue';

const state = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  evaluate: vi.fn(),
  success: vi.fn(),
  tree: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  evaluateCapabilities: state.evaluate,
}));
vi.mock('../../src/api/go/tree-resource', () => ({
  createTreeResourceApi: () => ({
    create: state.create,
    delete: state.delete,
    tree: state.tree,
    update: state.update,
  }),
}));
vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  const Box = defineComponent({
    props: ['spinning'],
    setup: (_, context) => () => h('div', context.slots.default?.()),
  });
  const Button = defineComponent({
    props: ['disabled'],
    emits: ['click'],
    setup: (props, context) => () =>
      h(
        'button',
        { disabled: props.disabled, onClick: () => context.emit('click') },
        context.slots.default?.(),
      ),
  });
  const Input = defineComponent({
    props: ['value'],
    emits: ['update:value'],
    setup: (props, context) => () =>
      h('input', {
        value: props.value ?? '',
        onInput: (event) => context.emit('update:value', event.target.value),
      }),
  });
  Input.Search = Input;
  const Tree = defineComponent({
    props: ['treeData'],
    emits: ['select'],
    setup: (props, context) => () => {
      const renderNodes = (nodes) =>
        nodes.flatMap((node) => {
          return [
            h(
              'button',
              {
                'data-node': node.id,
                onClick: () => context.emit('select', [node.id]),
              },
              node.name,
            ),
            ...renderNodes(node.children ?? []),
          ];
        });
      return h('nav', renderNodes(props.treeData));
    },
  });
  const Popconfirm = defineComponent({
    emits: ['confirm'],
    setup: (_, context) => () =>
      h('div', [
        context.slots.default?.(),
        h(
          'button',
          { 'data-confirm': true, onClick: () => context.emit('confirm') },
          'confirm',
        ),
      ]),
  });
  return {
    Alert: Box,
    Button,
    Empty: Box,
    Input,
    Popconfirm,
    Space: Box,
    Spin: Box,
    Tree,
    message: { error: vi.fn(), success: state.success },
  };
});

const endpoints = {
  create: '/tree/create',
  delete: '/tree/delete',
  get: '/tree/get',
  page: '/tree/page',
  tree: '/tree/tree',
  update: '/tree/update',
};
const capabilities = ['list', 'create', 'update', 'delete'].map((action) => ({
  action,
  key: `tenant.department:${action}`,
  resource: 'tenant.department',
}));

let app;
let root;
let selected;

async function flush() {
  for (let index = 0; index < 8; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount() {
  root = document.createElement('div');
  document.body.append(root);
  selected = vi.fn();
  app = createApp({
    setup: () => () =>
      h(
        CapabilityProvider,
        { capabilities },
        {
          default: () =>
            h(TreeResource, {
              authorizationResource: 'tenant.department',
              endpoints,
              fixedFilters: { tenant_id: 'tenant-1' },
              onSelect: selected,
            }),
        },
      ),
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  for (const mock of [
    state.create,
    state.delete,
    state.evaluate,
    state.success,
    state.tree,
    state.update,
  ])
    mock.mockReset();
  state.evaluate.mockResolvedValue({
    items: capabilities.map(({ key }) => ({ allowed: true, key })),
  });
  state.tree.mockResolvedValue([
    {
      children: [
        {
          children: [],
          id: 'leaf',
          name: 'Leaf',
          parent_id: 'root',
          sort_order: 1,
          version: 2,
        },
      ],
      id: 'root',
      name: 'Root',
      sort_order: 1,
      version: 1,
    },
  ]);
  state.delete.mockResolvedValue(undefined);
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('tree resource integration', () => {
  it('loads the complete tree with fixed filters and selects a real node', async () => {
    await mount();
    expect(state.tree).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { tenant_id: 'tenant-1' },
        keyword: '',
        signal: expect.any(AbortSignal),
      }),
    );
    expect(
      [...root.querySelectorAll('[data-node]')].map((node) => node.textContent),
    ).toEqual(['Root', 'Leaf']);
    root.querySelector('[data-node="leaf"]').click();
    await flush();
    expect(selected).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'leaf', version: 2 }),
    );
  });

  it('deletes only the selected leaf with its optimistic version and reloads', async () => {
    await mount();
    root.querySelector('[data-node="leaf"]').click();
    await flush();
    root.querySelector('[data-confirm]').click();
    await flush();
    expect(state.delete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'leaf', version: 2 }),
    );
    expect(state.tree).toHaveBeenCalledTimes(2);
    expect(state.success).toHaveBeenCalledWith('删除成功');
  });
});
