/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- behavioral grid stubs belong to this integration test */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ResourceTable from '../../src/components/business/GoResourceTable.vue';
import CapabilityProvider from '../../src/components/foundation/GoCapabilityProvider.vue';

const state = vi.hoisted(() => ({
  childProps: null,
  create: vi.fn(),
  delete: vi.fn(),
  evaluate: vi.fn(),
  page: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  createResourceApi: () => ({
    create: state.create,
    delete: state.delete,
    page: state.page,
    update: state.update,
  }),
  evaluateCapabilities: state.evaluate,
}));

vi.mock('../../src/components/business/GoDataGrid.vue', () => ({
  default: defineComponent({
    props: [
      'allowCreate',
      'canEdit',
      'canRemove',
      'dataProvider',
      'enabled',
      'remove',
    ],
    setup(props) {
      state.childProps = props;
      return () =>
        h('div', [
          h('output', { 'data-create': true }, String(props.allowCreate)),
          h(
            'button',
            {
              'data-load': true,
              onClick: () =>
                props.dataProvider({
                  filters: { statuses: ['active'] },
                  page: 2,
                  pageSize: 20,
                }),
            },
            'load',
          ),
          h(
            'button',
            {
              'data-delete': true,
              onClick: () => props.remove({ id: 'row-1', version: 7 }),
            },
            'delete',
          ),
        ]);
    },
  }),
}));

const capabilities = ['list', 'create', 'update', 'delete'].map((action) => ({
  action,
  key: `tenant.member:${action}`,
  resource: 'tenant.member',
}));

let app;
let resourceTable;
let root;

async function flush() {
  for (let index = 0; index < 8; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount() {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({
    setup: () => () =>
      h(
        CapabilityProvider,
        { capabilities },
        {
          default: () =>
            h(ResourceTable, {
              authorizationResource: 'tenant.member',
              columns: [{ field: 'name', title: '名称' }],
              endpoints: {
                create: '/tenant/members/create',
                delete: '/tenant/members/delete',
                get: '/tenant/members/get',
                page: '/tenant/members/page',
                update: '/tenant/members/update',
              },
              ref: (value) => (resourceTable = value),
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
    state.page,
    state.update,
  ])
    mock.mockReset();
  state.evaluate.mockResolvedValue({
    items: capabilities.map(({ key }) => ({ allowed: true, key })),
    revision: 'policy-1',
  });
  state.page.mockResolvedValue({
    items: [{ id: 'row-1', name: 'Member', version: 7 }],
    total: 1,
  });
  state.create.mockResolvedValue({});
  state.update.mockResolvedValue({});
  state.delete.mockResolvedValue(undefined);
});

afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  resourceTable = undefined;
  root = undefined;
});

describe('go resource table integration', () => {
  it('uses one page capability batch and exposes authorized create UI', async () => {
    await mount();

    expect(state.evaluate).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[data-create]').textContent).toBe('true');
  });

  it('forwards pagination filters and optimistic versions through the resource adapter', async () => {
    await mount();

    root.querySelector('[data-load]').click();
    await resourceTable.updateRecord(
      { name: 'updated' },
      { id: 'row-1', version: 7 },
    );
    root.querySelector('[data-delete]').click();
    await flush();

    expect(state.page).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { statuses: ['active'] },
        keyword: '',
        page: 2,
        page_size: 20,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(state.update).toHaveBeenCalledWith(
      { name: 'updated' },
      { id: 'row-1', version: 7 },
    );
    expect(state.delete).toHaveBeenCalledWith({ id: 'row-1', version: 7 });
  });

  it('merges external filters with immutable filters and ignores a late page response', async () => {
    let resolveFirst;
    let resolveSecond;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    state.page
      .mockReset()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);

    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () =>
        h(
          CapabilityProvider,
          { capabilities },
          {
            default: () =>
              h(ResourceTable, {
                authorizationResource: 'tenant.member',
                columns: [{ field: 'name', title: '名称' }],
                endpoints: {
                  create: '/tenant/members/create',
                  delete: '/tenant/members/delete',
                  get: '/tenant/members/get',
                  page: '/tenant/members/page',
                  update: '/tenant/members/update',
                },
                fixedFilters: { tenant_id: 'tenant-1' },
                query: { filters: { statuses: ['active'] }, keyword: 'alice' },
              }),
          },
        ),
    });
    app.mount(root);
    await flush();

    const oldRequest = state.childProps.dataProvider({
      filters: { department_ids: ['d1'] },
      page: 1,
      pageSize: 20,
    });
    const newRequest = state.childProps.dataProvider({
      filters: { department_ids: ['d2'] },
      page: 2,
      pageSize: 20,
    });
    resolveSecond({ items: [{ id: 'new', version: 1 }], total: 1 });
    await expect(newRequest).resolves.toEqual({
      items: [{ id: 'new', version: 1 }],
      total: 1,
    });
    resolveFirst({ items: [{ id: 'old', version: 1 }], total: 1 });
    await expect(oldRequest).rejects.toMatchObject({ name: 'AbortError' });

    expect(state.page).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: {
          department_ids: ['d2'],
          statuses: ['active'],
          tenant_id: 'tenant-1',
        },
        keyword: 'alice',
        page: 2,
      }),
    );
  });
});
