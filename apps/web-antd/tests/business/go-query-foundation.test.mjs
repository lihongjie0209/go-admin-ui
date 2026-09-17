import { createApp, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import QueryForm from '../../src/components/foundation/GoQueryForm.vue';
import { normalizeQuery } from '../../src/components/foundation/query-contract';

const ui = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  const Box = defineComponent({
    setup: (_, context) => () => h('div', context.slots.default?.()),
  });
  const Input = defineComponent({
    props: ['placeholder', 'value'],
    emits: ['pressEnter', 'update:value'],
    setup: (props, context) => () =>
      h('input', {
        placeholder: props.placeholder,
        value: props.value ?? '',
        onInput: (event) => context.emit('update:value', event.target.value),
        onKeydown: (event) =>
          event.key === 'Enter' && context.emit('pressEnter'),
      }),
  });
  const Button = defineComponent({
    props: ['disabled', 'htmlType', 'loading'],
    emits: ['click'],
    setup: (props, context) => () =>
      h(
        'button',
        {
          disabled: props.disabled || props.loading,
          onClick: () => context.emit('click'),
          type: props.htmlType,
        },
        context.slots.default?.(),
      ),
  });
  const DatePicker = {};
  DatePicker.RangePicker = Box;
  return {
    Button,
    DatePicker,
    Form: Box,
    FormItem: Box,
    Input,
    InputNumber: Input,
    Space: Box,
    message: { error: ui.error },
  };
});

vi.mock('../../src/components/foundation/GoDictionarySelect.vue', async () => {
  const { defineComponent } = await import('vue');
  return { default: defineComponent({ render: () => null }) };
});
vi.mock(
  '../../src/components/foundation/GoDictionaryTreeSelect.vue',
  async () => {
    const { defineComponent } = await import('vue');
    return { default: defineComponent({ render: () => null }) };
  },
);

let app;
let root;

async function flush() {
  await Promise.resolve();
  await nextTick();
}

afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  root = undefined;
  ui.error.mockReset();
});

describe('query contract', () => {
  it('normalizes keyword, IN values, ranges, and explicit filter names', () => {
    const date = { format: () => '2026-09-17T08:00:00+08:00' };
    expect(
      normalizeQuery(
        [
          { key: 'keyword', label: '关键词', type: 'keyword' },
          { filterKey: 'user_ids', key: 'users', label: '用户', type: 'id-in' },
          {
            fromKey: 'created_at_from',
            key: 'created',
            label: '创建时间',
            toKey: 'created_at_to',
            type: 'date-range',
          },
          { key: 'amount', label: '金额', type: 'number-range' },
          { key: 'succeeded', label: '执行结果', type: 'boolean' },
        ],
        {
          amount: [10, 20],
          created: [date, date],
          keyword: '  alice  ',
          succeeded: 'false',
          users: 'user-1, user-2\nuser-1',
        },
      ),
    ).toEqual({
      filters: {
        amount_from: 10,
        amount_to: 20,
        created_at_from: '2026-09-17T08:00:00+08:00',
        created_at_to: '2026-09-17T08:00:00+08:00',
        succeeded: false,
        user_ids: ['user-1', 'user-2'],
      },
      keyword: 'alice',
    });
  });

  it('rejects an oversized IN filter before making a request', () => {
    expect(() =>
      normalizeQuery(
        [{ key: 'ids', label: 'ID', maxItems: 2, type: 'id-in' }],
        { ids: '1,2,3' },
      ),
    ).toThrow('ID最多选择 2 项');
  });

  it('mounts the real query form and emits normalized submit and reset values', async () => {
    const submitted = vi.fn();
    const reset = vi.fn();
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () =>
        h(QueryForm, {
          fields: [
            {
              key: 'keyword',
              label: '关键词',
              placeholder: '搜索名称',
              type: 'keyword',
            },
          ],
          initialValues: { keyword: 'initial' },
          onReset: reset,
          onSubmit: submitted,
        }),
    });
    app.mount(root);
    await flush();

    const input = root.querySelector('input');
    input.value = '  changed  ';
    input.dispatchEvent(new Event('input'));
    await flush();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await flush();
    expect(submitted).toHaveBeenLastCalledWith({
      filters: {},
      keyword: 'changed',
    });

    [...root.querySelectorAll('button')]
      .find((button) => button.textContent === '重置')
      .click();
    await flush();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(submitted).toHaveBeenLastCalledWith({
      filters: {},
      keyword: 'initial',
    });
  });
});
