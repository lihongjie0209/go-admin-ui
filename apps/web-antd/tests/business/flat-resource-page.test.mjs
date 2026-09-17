/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- integration stubs intentionally stay beside the page composition test */
import { createApp, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FlatResourcePage from '../../src/templates/resource/FlatResourcePage.vue';
import { mutationCapabilities } from '../../src/templates/resource/resource-page-contract';

const state = vi.hoisted(() => ({
  capabilities: null,
  detailProps: null,
  editorProps: null,
  tableProps: null,
  workspace: {
    createRecord: vi.fn(),
    reload: vi.fn(),
    updateRecord: vi.fn(),
  },
}));

vi.mock('../../src/components/business/GoResourceDetail.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      inheritAttrs: false,
      props: [
        'authorizationResource',
        'endpoints',
        'fields',
        'open',
        'recordId',
      ],
      setup(props) {
        return () => {
          state.detailProps = props;
          return h('aside', { 'data-detail': props.open });
        };
      },
    }),
  };
});

vi.mock(
  '../../src/components/foundation/GoCapabilityProvider.vue',
  async () => {
    const { defineComponent } = await import('vue');
    return {
      default: defineComponent({
        props: ['capabilities'],
        setup:
          (props, { slots }) =>
          () => {
            state.capabilities = props.capabilities;
            return slots.default?.();
          },
      }),
    };
  },
);

vi.mock('../../src/components/business/GoResourceWorkspace.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      inheritAttrs: false,
      props: ['initialQueryValues', 'queryFields', 'table'],
      setup(props, { expose }) {
        expose(state.workspace);
        return () => {
          state.tableProps = props.table;
          return h('main', { 'data-workspace': true });
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
        'mode',
        'open',
        'record',
        'submit',
      ],
      setup(props, { attrs }) {
        return () => {
          state.editorProps = { ...attrs, ...props };
          return h('aside', { 'data-editor': props.open });
        };
      },
    }),
  };
});

const contract = {
  authorizationResource: 'tenant.member',
  detailFields: [{ field: 'name', label: '名称' }],
  editorFields: [{ field: 'name', label: '名称', required: true }],
  queryFields: [{ key: 'keyword', label: '关键词', type: 'keyword' }],
  table: {
    columns: [{ field: 'name', title: '名称' }],
    endpoints: {
      create: '/members/create',
      delete: '/members/delete',
      get: '/members/get',
      page: '/members/page',
      update: '/members/update',
    },
  },
};

let app;
let root;

async function flush() {
  for (let index = 0; index < 5; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount(pageContract = contract) {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({
    setup: () => () => h(FlatResourcePage, { contract: pageContract }),
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  state.detailProps = null;
  state.editorProps = null;
  state.tableProps = null;
  state.capabilities = null;
  state.workspace.createRecord.mockReset().mockResolvedValue({ id: 'new' });
  state.workspace.reload.mockReset().mockResolvedValue(undefined);
  state.workspace.updateRecord.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('flat resource page template', () => {
  it('builds stable default mutation capabilities', () => {
    expect(mutationCapabilities('tenant.member')).toEqual([
      {
        action: 'create',
        key: 'tenant.member:create',
        resource: 'tenant.member',
      },
      {
        action: 'update',
        key: 'tenant.member:update',
        resource: 'tenant.member',
      },
      {
        action: 'delete',
        key: 'tenant.member:delete',
        resource: 'tenant.member',
      },
    ]);
  });

  it('connects create and edit actions to one declarative editor', async () => {
    await mount();
    state.tableProps.createAction();
    await flush();
    expect(state.editorProps.mode).toBe('create');
    expect(state.editorProps.open).toBe(true);

    const row = { id: 'member-1', name: 'Alice', version: 4 };
    state.tableProps.editAction(row);
    await flush();
    expect(state.editorProps.mode).toBe('edit');
    expect(state.editorProps.record).toEqual(row);
  });

  it('preserves a resource contract that forbids creation', async () => {
    await mount({
      ...contract,
      table: { ...contract.table, allowCreate: false },
    });
    expect(state.tableProps.allowCreate).toBe(false);
    expect(state.capabilities).not.toContainEqual({
      action: 'create',
      key: 'tenant.member:create',
      resource: 'tenant.member',
    });
  });

  it('does not mount an editor for a completely read-only resource', async () => {
    await mount({
      ...contract,
      table: {
        ...contract.table,
        allowCreate: false,
        allowDelete: false,
        allowEdit: false,
      },
    });

    expect(state.editorProps).toBeNull();
    expect(state.capabilities).not.toContainEqual(
      expect.objectContaining({ action: 'create' }),
    );
    expect(state.capabilities).not.toContainEqual(
      expect.objectContaining({ action: 'update' }),
    );
    expect(state.capabilities).not.toContainEqual(
      expect.objectContaining({ action: 'delete' }),
    );
  });

  it('opens detail through the standard row action', async () => {
    await mount();
    const detail = state.tableProps.rowActions.find(
      (action) => action.key === 'detail',
    );
    await detail.run({ id: 'member-1', name: 'Alice', version: 4 });
    await flush();
    expect(state.detailProps.open).toBe(true);
    expect(state.detailProps.recordId).toBe('member-1');
  });

  it('commits mutations before refreshing the workspace', async () => {
    await mount();
    await state.editorProps.submit({ name: 'New' }, null);
    expect(state.workspace.createRecord).toHaveBeenCalledWith({ name: 'New' });
    expect(state.workspace.reload).not.toHaveBeenCalled();
    state.editorProps.onSaved();
    await flush();
    expect(state.workspace.reload).toHaveBeenLastCalledWith({
      resetPage: true,
    });

    const snapshot = { id: 'member-1', name: 'Old', version: 4 };
    state.tableProps.editAction(snapshot);
    await flush();
    await state.editorProps.submit({ name: 'Changed' }, snapshot);
    expect(state.workspace.updateRecord).toHaveBeenCalledWith(
      { name: 'Changed' },
      snapshot,
    );
    state.editorProps.onSaved();
    await flush();
    expect(state.workspace.reload).toHaveBeenLastCalledWith({
      resetPage: false,
    });
  });
});
