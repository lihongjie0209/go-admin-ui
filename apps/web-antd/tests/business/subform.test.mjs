import { createApp, defineComponent, h, nextTick, reactive } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import Subform from '../../src/components/business/GoSubform.vue';

vi.mock('ant-design-vue', () => ({
  Button: defineComponent({
    props: ['disabled'],
    emits: ['click'],
    setup: (props, context) => () =>
      h(
        'button',
        { disabled: props.disabled, onClick: () => context.emit('click') },
        context.slots.default?.(),
      ),
  }),
  Empty: defineComponent({
    props: ['description'],
    setup: (props) => () => h('p', { 'data-empty': true }, props.description),
  }),
}));

let app;
let root;
const flush = async () => {
  await Promise.resolve();
  await nextTick();
};
afterEach(() => {
  app?.unmount();
  root?.remove();
});
async function mount(props, slot) {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({ setup: () => () => h(Subform, props, { default: slot }) });
  app.mount(root);
  await flush();
}

describe('标准子表单', () => {
  it('手写页面可通过作用域插槽新增、编辑和移除明细', async () => {
    const state = reactive({ rows: [{ name: '服务器' }] });
    await mount(
      {
        title: '采购明细',
        value: state.rows,
        createRow: () => ({ name: '' }),
        'onUpdate:value': (rows) => {
          state.rows.splice(0, state.rows.length, ...rows);
        },
      },
      ({ row, update }) =>
        h('input', {
          value: row.name,
          onInput: (event) => update({ ...row, name: event.target.value }),
        }),
    );
    root.querySelector('input').value = '交换机';
    root.querySelector('input').dispatchEvent(new Event('input'));
    await flush();
    expect(state.rows[0].name).toBe('交换机');
    [...root.querySelectorAll('button')]
      .find((button) => button.textContent === '添加一行')
      .click();
    await flush();
    expect(state.rows).toHaveLength(2);
    [...root.querySelectorAll('button')]
      .find((button) => button.textContent === '移除')
      .click();
    await flush();
    expect(state.rows).toHaveLength(1);
  });

  it('已保存行可以转换为删除墓碑且不再渲染', async () => {
    const state = reactive({
      rows: [{ id: 'line-1', version: 3, name: '历史行' }],
    });
    await mount(
      {
        title: '明细',
        value: state.rows,
        removeRow: (row) => ({ ...row, delete: true }),
        isRowHidden: (row) => row.delete === true,
        'onUpdate:value': (rows) => {
          state.rows.splice(0, state.rows.length, ...rows);
        },
      },
      ({ row }) => h('span', row.name),
    );
    [...root.querySelectorAll('button')]
      .find((button) => button.textContent === '移除')
      .click();
    await flush();
    expect(state.rows).toEqual([
      { id: 'line-1', version: 3, name: '历史行', delete: true },
    ]);
    expect(root.textContent).not.toContain('历史行');
    expect(root.querySelector('[data-empty]')).not.toBeNull();
  });

  it('最小/最大行数和只读状态会限制动作', async () => {
    await mount({ title: '明细', value: [{}], minRows: 1, maxRows: 1 }, () =>
      h('span', '行'),
    );
    const buttons = [...root.querySelectorAll('button')];
    expect(
      buttons.find((button) => button.textContent === '添加一行').disabled,
    ).toBe(true);
    expect(
      buttons.find((button) => button.textContent === '移除').disabled,
    ).toBe(true);
    app.unmount();
    root.remove();
    await mount({ title: '只读明细', value: [{}], readonly: true }, () =>
      h('span', '行'),
    );
    expect(root.querySelectorAll('button')).toHaveLength(0);
  });

  it('行级校验展示带序号的明确错误并可由提交方统一读取', async () => {
    let exposed;
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () =>
        h(
          Subform,
          {
            ref: (value) => {
              exposed = value;
            },
            title: '明细',
            value: [{ name: '' }],
            validateRow: (row) => (row.name ? [] : ['商品不能为空']),
          },
          { default: () => h('input') },
        ),
    });
    app.mount(root);
    await flush();
    expect(root.textContent).toContain('第 1 行：商品不能为空');
    expect(exposed.validate()).toEqual(['第 1 行：商品不能为空']);
  });

  it('表格模式按列渲染并通过单元格插槽编辑', async () => {
    const state = reactive({ rows: [{ product: '服务器', quantity: 1 }] });
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () =>
        h(
          Subform,
          {
            mode: 'table',
            columns: [{ key: 'product', title: '商品' }],
            value: state.rows,
            'onUpdate:value': (rows) => {
              state.rows.splice(0, state.rows.length, ...rows);
            },
          },
          {
            cell: ({ row, update }) =>
              h('input', {
                value: row.product,
                onInput: (event) =>
                  update({ ...row, product: event.target.value }),
              }),
          },
        ),
    });
    app.mount(root);
    await flush();
    expect(root.textContent).toContain('商品');
    const input = root.querySelector('input');
    input.value = '交换机';
    input.dispatchEvent(new Event('input'));
    await flush();
    expect(state.rows[0].product).toBe('交换机');
  });
});
