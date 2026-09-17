import { createApp, h, nextTick } from 'vue';

import { afterEach, describe, expect, it, vi } from 'vitest';

import ResourceWorkspace from '../../src/components/business/GoResourceWorkspace.vue';

const state = vi.hoisted(() => ({ tableProps: null }));

vi.mock('../../src/components/foundation/GoQueryForm.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      emits: ['submit'],
      setup: (_, context) => () =>
        h(
          'button',
          {
            'data-query': true,
            onClick: () =>
              context.emit('submit', {
                filters: { statuses: ['disabled'] },
                keyword: 'new',
              }),
          },
          'query',
        ),
    }),
  };
});

vi.mock('../../src/components/business/GoResourceTable.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      inheritAttrs: false,
      setup: (_, context) => () => {
        state.tableProps = context.attrs;
        return h(
          'output',
          { 'data-table-query': true },
          JSON.stringify(context.attrs.query),
        );
      },
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

describe('resource workspace composition', () => {
  it('normalizes initial filters and passes later queries to the resource table', async () => {
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () =>
        h(ResourceWorkspace, {
          initialQueryValues: { keyword: ' initial ', statuses: ['active'] },
          queryFields: [
            { key: 'keyword', label: '关键词', type: 'keyword' },
            {
              key: 'statuses',
              label: '状态',
              multiple: true,
              type: 'dictionary',
            },
          ],
          table: {
            authorizationResource: 'tenant.member',
            columns: [],
            endpoints: {
              create: '',
              delete: '',
              get: '',
              page: '',
              update: '',
            },
          },
        }),
    });
    app.mount(root);
    await flush();

    expect(state.tableProps.query).toEqual({
      filters: { statuses: ['active'] },
      keyword: 'initial',
    });
    root.querySelector('[data-query]').click();
    await flush();
    expect(state.tableProps.query).toEqual({
      filters: { statuses: ['disabled'] },
      keyword: 'new',
    });
  });

  it('does not render an empty query panel for resources without filters', async () => {
    root = document.createElement('div');
    document.body.append(root);
    app = createApp({
      setup: () => () =>
        h(ResourceWorkspace, {
          queryFields: [],
          table: {
            authorizationResource: 'tenant.profile',
            columns: [],
            endpoints: {
              create: '',
              delete: '',
              get: '',
              page: '/tenants/page',
              update: '',
            },
          },
        }),
    });
    app.mount(root);
    await flush();

    expect(root.querySelector('[data-query]')).toBeNull();
    expect(root.querySelector('[data-table-query]')).not.toBeNull();
  });
});
