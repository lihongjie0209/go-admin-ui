/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- behavioral Ant Design stubs belong to this integration test */
import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DataGrid from '../../src/components/business/GoDataGrid.vue';

const state = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  const Box = defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('div', slots.default?.()),
  });
  return {
    Alert: Box,
    Button: defineComponent({
      props: ['disabled'],
      emits: ['click'],
      setup:
        (props, { emit, slots }) =>
        () =>
          h(
            'button',
            { disabled: props.disabled, onClick: () => emit('click') },
            slots.default?.(),
          ),
    }),
    Popconfirm: defineComponent({
      emits: ['confirm'],
      setup:
        (_, { emit, slots }) =>
        () =>
          h('span', [
            slots.default?.(),
            h(
              'button',
              { 'data-confirm': true, onClick: () => emit('confirm') },
              'confirm',
            ),
          ]),
    }),
    Space: Box,
    Table: defineComponent({
      props: ['columns', 'dataSource', 'rowSelection'],
      setup:
        (props, { slots }) =>
        () =>
          h(
            'table',
            props.dataSource.map((row) =>
              h('tr', { 'data-row': row.id }, [
                h('input', {
                  'data-select': row.id,
                  type: 'checkbox',
                  onChange: () => props.rowSelection.onChange([row.id]),
                }),
                ...props.columns.map((column) =>
                  h(
                    'td',
                    column.key === 'action'
                      ? slots.bodyCell?.({ column, record: row })
                      : String(row[column.dataIndex] ?? ''),
                  ),
                ),
              ]),
            ),
          ),
    }),
    message: { error: state.error, success: state.success },
  };
});

vi.mock('../../src/components/foundation/GoPagination.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      emits: ['change'],
      setup:
        (_, { emit }) =>
        () =>
          h(
            'button',
            {
              'data-next': true,
              onClick: () => emit('change', { page: 2, page_size: 50 }),
            },
            'next',
          ),
    }),
  };
});

const rows = [
  { id: 'row-1', name: 'Alice', version: 1 },
  { id: 'row-2', name: 'Bob', version: 2 },
];
let app;
let root;
let dataProvider;
let edit;
let remove;
let detail;
let batch;

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
      h(DataGrid, {
        batchActions: [{ key: 'disable', label: '批量禁用', run: batch }],
        columns: [
          { field: 'name', title: '姓名' },
          { field: 'action', title: '操作' },
        ],
        dataProvider,
        editAction: edit,
        remove,
        rowActions: [
          { deferred: true, key: 'detail', label: '查看', run: detail },
        ],
      }),
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  dataProvider = vi.fn().mockResolvedValue({ items: rows, total: 2 });
  edit = vi.fn();
  remove = vi.fn().mockResolvedValue(undefined);
  detail = vi.fn().mockResolvedValue(undefined);
  batch = vi.fn().mockResolvedValue(undefined);
  state.error.mockReset();
  state.success.mockReset();
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('go data grid', () => {
  it('does not read data until the caller enables the grid', async () => {
    const enabled = ref(false);
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup() {
        return () =>
          h(DataGrid, {
            columns: [{ field: 'name', title: '姓名' }],
            dataProvider,
            enabled: enabled.value,
          });
      },
    });
    app.mount(root);
    await flush();
    expect(dataProvider).not.toHaveBeenCalled();

    enabled.value = true;
    await flush();
    expect(dataProvider).toHaveBeenCalledTimes(1);
  });

  it('loads pages and forwards page changes without any backend-specific client', async () => {
    await mount();
    expect(dataProvider).toHaveBeenCalledWith({
      filters: {},
      page: 1,
      pageSize: 20,
    });
    expect(root.textContent).toContain('Alice');
    root.querySelector('[data-next]').click();
    await flush();
    expect(dataProvider).toHaveBeenLastCalledWith({
      filters: {},
      page: 2,
      pageSize: 50,
    });
  });

  it('runs edit and deferred detail actions without an implicit reload', async () => {
    await mount();
    const buttons = [
      ...root.querySelector('[data-row="row-1"]').querySelectorAll('button'),
    ];
    buttons.find((button) => button.textContent.includes('编辑')).click();
    buttons.find((button) => button.textContent.includes('查看')).click();
    await flush();
    expect(edit).toHaveBeenCalledWith(rows[0]);
    expect(detail).toHaveBeenCalledWith(rows[0]);
    expect(dataProvider).toHaveBeenCalledTimes(1);
  });

  it('passes selected rows to a batch action and reloads after success', async () => {
    await mount();
    root
      .querySelector('[data-select="row-2"]')
      .dispatchEvent(new Event('change'));
    await flush();
    const action = [...root.querySelectorAll('button')].find((button) =>
      button.textContent.includes('批量禁用'),
    );
    expect(action.disabled).toBe(false);
    action.click();
    await flush();
    expect(batch).toHaveBeenCalledWith([rows[1]]);
    expect(dataProvider).toHaveBeenCalledTimes(2);
  });

  it('deletes through the injected adapter and reloads', async () => {
    await mount();
    const row = root.querySelector('[data-row="row-1"]');
    const deleteButton = [...row.querySelectorAll('button')].find((button) =>
      button.textContent.includes('删除'),
    );
    expect(deleteButton).toBeTruthy();
    row.querySelector('[data-confirm]').click();
    await flush();
    expect(remove).toHaveBeenCalledWith(rows[0]);
    expect(state.success).toHaveBeenCalledWith('删除成功');
    expect(dataProvider).toHaveBeenCalledTimes(2);
  });
});
