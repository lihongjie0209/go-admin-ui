import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import GoPagination from '../../src/components/foundation/GoPagination.vue';

vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    Pagination: defineComponent({
      props: ['current', 'pageSize', 'total'],
      emits: ['change'],
      setup: (props, context) => () =>
        h('div', [
          h(
            'output',
            { 'data-page': true },
            `${props.current}/${props.pageSize}/${props.total}`,
          ),
          h(
            'button',
            {
              'data-next': true,
              onClick: () =>
                context.emit('change', props.current + 1, props.pageSize),
            },
            'next',
          ),
          h(
            'button',
            {
              'data-size': true,
              onClick: () => context.emit('change', props.current, 50),
            },
            'size',
          ),
        ]),
    }),
  };
});

let app;
let root;

async function flush() {
  await Promise.resolve();
  await nextTick();
}

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('pagination foundation', () => {
  it('emits the backend page contract and resets to page one on page-size changes', async () => {
    const changed = vi.fn();
    const props = reactive({ page: 2, pageSize: 20, total: 100 });
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () => h(GoPagination, { ...props, onChange: changed }),
    });
    app.mount(root);
    await flush();

    root.querySelector('[data-next]').click();
    root.querySelector('[data-size]').click();
    await flush();
    expect(changed.mock.calls).toEqual([
      [{ page: 3, page_size: 20 }],
      [{ page: 1, page_size: 50 }],
    ]);
  });

  it('clamps a stale page after the result total shrinks', async () => {
    const changed = vi.fn();
    const props = reactive({ page: 5, pageSize: 20, total: 100 });
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () => h(GoPagination, { ...props, onChange: changed }),
    });
    app.mount(root);
    await flush();
    props.total = 21;
    await flush();
    expect(changed).toHaveBeenLastCalledWith({ page: 2, page_size: 20 });
  });
});
