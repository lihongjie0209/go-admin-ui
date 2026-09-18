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
  evaluateRows: vi.fn(),
  page: vi.fn(),
  rowAction: vi.fn(),
  track: vi.fn(),
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
  evaluateRowCapabilities: state.evaluateRows,
  trackFrontendAction: state.track,
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
      'rowActions',
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
          h(
            'button',
            {
              'data-row-action': true,
              onClick: () =>
                props.rowActions[0].run({ id: 'row-1', version: 7 }),
            },
            'row action',
          ),
        ]);
    },
  }),
}));

const capabilities = ['list', 'create', 'update', 'delete', 'assign-role'].map(
  (action) => ({
    action,
    key: `tenant.member:${action}`,
    resource: 'tenant.member',
  }),
);
capabilities.push(
  {
    action: 'list',
    key: 'tenant.role:list',
    resource: 'tenant.role',
  },
  {
    action: 'read',
    key: 'tenant.authorization:read',
    resource: 'tenant.authorization',
  },
);

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
              createAuthorizations: [
                {
                  action: 'read',
                  key: 'tenant.authorization:read',
                  resource: 'tenant.authorization',
                },
              ],
              endpoints: {
                create: '/tenant/members/create',
                delete: '/tenant/members/delete',
                get: '/tenant/members/get',
                page: '/tenant/members/page',
                update: '/tenant/members/update',
              },
              rowActions: [
                {
                  additionalAuthorizations: [
                    {
                      action: 'list',
                      key: 'tenant.role:list',
                      resource: 'tenant.role',
                    },
                  ],
                  authorization: {
                    action: 'assign-role',
                    key: 'tenant.member:assign-role',
                    resource: 'tenant.member',
                  },
                  key: 'assign-role',
                  label: '分配角色',
                  rowAuthorization: true,
                  run: state.rowAction,
                },
              ],
              rowAuthorization: true,
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
    state.evaluateRows,
    state.page,
    state.rowAction,
    state.track,
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
  state.evaluateRows.mockResolvedValue({
    items: [
      {
        actions: { 'assign-role': true, delete: true, update: true },
        resource_id: 'row-1',
      },
    ],
  });
  state.create.mockResolvedValue({});
  state.update.mockResolvedValue({});
  state.delete.mockResolvedValue(undefined);
  state.rowAction.mockResolvedValue(undefined);
  state.track.mockImplementation(async (_event, operation) => operation());
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

  it('does not register or evaluate disabled mutation capabilities', async () => {
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () =>
        h(
          CapabilityProvider,
          {
            capabilities: [
              {
                action: 'list',
                key: 'identity.session:list',
                resource: 'identity.session',
              },
            ],
          },
          {
            default: () =>
              h(ResourceTable, {
                allowCreate: false,
                allowDelete: false,
                allowEdit: false,
                authorizationResource: 'identity.session',
                columns: [{ field: 'status', title: '状态' }],
                endpoints: {
                  create: '/auth/sessions/page',
                  delete: '/auth/sessions/revoke',
                  get: '/auth/sessions/page',
                  page: '/auth/sessions/page',
                  update: '/auth/sessions/revoke',
                },
              }),
          },
        ),
    });
    app.mount(root);
    await flush();

    expect(state.evaluate).toHaveBeenCalledTimes(1);
    expect(state.evaluate).toHaveBeenCalledWith([
      {
        action: 'list',
        key: 'identity.session:list',
        resource: 'identity.session',
      },
    ]);
    expect(state.evaluateRows).not.toHaveBeenCalled();
  });

  it('hides create when an editor option dependency is not authorized', async () => {
    state.evaluate.mockResolvedValueOnce({
      items: capabilities.map(({ key }) => ({
        allowed: key !== 'tenant.authorization:read',
        key,
      })),
      revision: 'policy-2',
    });
    await mount();

    expect(root.querySelector('[data-create]').textContent).toBe('false');
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

  it('tracks custom row actions with their authorization identity and row ID', async () => {
    await mount();

    await state.childProps.dataProvider({ filters: {}, page: 1, pageSize: 20 });
    await flush();

    root.querySelector('[data-row-action]').click();
    await flush();

    expect(state.rowAction).toHaveBeenCalledWith({ id: 'row-1', version: 7 });
    expect(state.track).toHaveBeenCalledWith(
      {
        application_id: '',
        event_name: 'tenant.member:assign-role',
        page_route: '',
        resource_id: 'row-1',
      },
      expect.any(Function),
    );
  });

  it('hides cross-resource actions when any additional capability is denied', async () => {
    state.evaluate.mockResolvedValueOnce({
      items: capabilities.map(({ key }) => ({
        allowed: key !== 'tenant.role:list',
        key,
      })),
      revision: 'policy-2',
    });
    await mount();
    await state.childProps.dataProvider({ filters: {}, page: 1, pageSize: 20 });
    await flush();

    expect(state.childProps.rowActions[0].visible({ id: 'row-1' })).toBe(false);
    expect(state.track).not.toHaveBeenCalled();
  });

  it('applies row decisions to custom actions that opt into object authorization', async () => {
    await mount();
    await state.childProps.dataProvider({ filters: {}, page: 1, pageSize: 20 });
    await flush();

    expect(state.evaluateRows).toHaveBeenCalledWith(
      'tenant.member',
      ['update', 'delete', 'assign-role'],
      ['row-1'],
    );
    expect(state.childProps.rowActions[0].visible({ id: 'row-1' })).toBe(true);

    state.evaluateRows.mockResolvedValueOnce({
      items: [
        {
          actions: { 'assign-role': false, delete: true, update: true },
          resource_id: 'row-1',
        },
      ],
    });
    await state.childProps.dataProvider({ filters: {}, page: 1, pageSize: 20 });
    await flush();
    expect(state.childProps.rowActions[0].visible({ id: 'row-1' })).toBe(false);
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
    expect(state.evaluateRows).not.toHaveBeenCalled();
  });
});
