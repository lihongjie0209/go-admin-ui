/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- integration stubs intentionally stay beside the page composition test */
import { createApp, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TreeResourcePage from '../../src/templates/resource/TreeResourcePage.vue';

const state = vi.hoisted(() => ({
  editorProps: null,
  treeAttrs: null,
  tree: {
    createNode: vi.fn(),
    updateNode: vi.fn(),
  },
}));

vi.mock(
  '../../src/components/foundation/GoCapabilityProvider.vue',
  async () => {
    const { defineComponent } = await import('vue');
    return {
      default: defineComponent({
        props: ['capabilities'],
        setup:
          (_, { slots }) =>
          () =>
            slots.default?.(),
      }),
    };
  },
);

vi.mock('../../src/components/business/GoTreeResource.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      inheritAttrs: false,
      props: [
        'authorizationResource',
        'endpoints',
        'fixedFilters',
        'rowAuthorization',
      ],
      emits: ['create', 'edit'],
      setup(props, { emit, expose }) {
        expose(state.tree);
        return () => {
          state.treeAttrs = props;
          return h('nav', [
            h('button', {
              'data-create-root': true,
              onClick: () => emit('create', null),
            }),
            h('button', {
              'data-create-child': true,
              onClick: () =>
                emit('create', {
                  children: [],
                  id: 'parent-1',
                  name: 'Parent',
                  parent_id: null,
                  version: 2,
                }),
            }),
            h('button', {
              'data-edit': true,
              onClick: () =>
                emit('edit', {
                  children: [],
                  id: 'node-1',
                  name: 'Node',
                  parent_id: 'parent-1',
                  version: 3,
                }),
            }),
          ]);
        };
      },
    }),
  };
});

vi.mock('../../src/components/business/GoResourceEditor.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      inheritAttrs: false,
      props: [
        'authorizationResource',
        'fields',
        'initialValues',
        'mode',
        'open',
        'record',
        'submit',
      ],
      setup(props) {
        return () => {
          state.editorProps = props;
          return h('aside');
        };
      },
    }),
  };
});

const contract = {
  authorizationResource: 'tenant.department',
  editorFields: [
    { field: 'name', label: '名称', required: true },
    { field: 'parent_id', label: '上级部门' },
  ],
  endpoints: {
    create: '/departments/create',
    delete: '/departments/delete',
    get: '/departments/get',
    page: '/departments/page',
    tree: '/departments/tree',
    update: '/departments/update',
  },
  fixedFilters: { tenant_id: 'tenant-1' },
  rowAuthorization: true,
};

let app;
let root;

async function flush() {
  for (let index = 0; index < 5; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount() {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({ setup: () => () => h(TreeResourcePage, { contract }) });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  state.editorProps = null;
  state.tree.createNode.mockReset().mockResolvedValue(undefined);
  state.tree.updateNode.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('tree resource page template', () => {
  it('forwards isolation and row-authorization configuration', async () => {
    await mount();
    expect(state.treeAttrs.fixedFilters).toEqual({ tenant_id: 'tenant-1' });
    expect(state.treeAttrs.rowAuthorization).toBe(true);
  });

  it('prefills the selected parent for child creation', async () => {
    await mount();
    root.querySelector('[data-create-child]').click();
    await flush();
    expect(state.editorProps.mode).toBe('create');
    expect(state.editorProps.initialValues).toEqual({ parent_id: 'parent-1' });
    await state.editorProps.submit(
      { name: 'Child', parent_id: 'parent-1' },
      null,
    );
    expect(state.tree.createNode).toHaveBeenCalledWith({
      name: 'Child',
      parent_id: 'parent-1',
    });
  });

  it('passes the optimistic node snapshot to tree updates', async () => {
    await mount();
    root.querySelector('[data-edit]').click();
    await flush();
    const snapshot = {
      children: [],
      id: 'node-1',
      name: 'Node',
      parent_id: 'parent-1',
      version: 3,
    };
    await state.editorProps.submit({ name: 'Changed' }, snapshot);
    expect(state.tree.updateNode).toHaveBeenCalledWith(
      { name: 'Changed' },
      snapshot,
    );
  });
});
