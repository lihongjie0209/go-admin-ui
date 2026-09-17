/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- behavioral component stubs belong to this integration test */
import { createApp, h, nextTick, ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  detailJSON,
  detailText,
} from '../../src/components/business/detail-contract';
import ResourceDetail from '../../src/components/business/GoResourceDetail.vue';
import CapabilityProvider from '../../src/components/foundation/GoCapabilityProvider.vue';

const state = vi.hoisted(() => ({
  evaluate: vi.fn(),
  get: vi.fn(),
}));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  createResourceApi: () => ({ get: state.get }),
  evaluateCapabilities: state.evaluate,
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
    Alert: defineComponent({
      props: ['message'],
      setup:
        (props, { slots }) =>
        () =>
          h('section', [props.message, slots.action?.()]),
    }),
    Button: defineComponent({
      emits: ['click'],
      setup:
        (_, { emit, slots }) =>
        () =>
          h('button', { onClick: () => emit('click') }, slots.default?.()),
    }),
    Descriptions: Box,
    DescriptionsItem: defineComponent({
      props: ['label'],
      setup:
        (props, { slots }) =>
        () =>
          h('div', [h('strong', props.label), slots.default?.()]),
    }),
    Divider: Box,
    Drawer: defineComponent({
      props: ['open'],
      setup:
        (props, { slots }) =>
        () =>
          props.open ? h('aside', slots.default?.()) : null,
    }),
    Empty: defineComponent({
      props: ['description'],
      setup: (props) => () => h('p', props.description),
    }),
    Spin: Box,
  };
});

vi.mock('../../src/components/foundation/GoAuditSummary.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      props: ['value'],
      setup: (props) => () => h('output', `version:${props.value.version}`),
    }),
  };
});
vi.mock('../../src/components/foundation/GoDateTimeText.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      props: ['value'],
      setup: (props) => () => h('time', String(props.value)),
    }),
  };
});
vi.mock('../../src/components/foundation/GoDictionaryText.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      props: ['value'],
      setup: (props) => () => h('span', `dictionary:${props.value}`),
    }),
  };
});
vi.mock('../../src/components/foundation/GoEntityReference.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      props: ['name'],
      setup: (props) => () => h('span', props.name),
    }),
  };
});
vi.mock('../../src/components/foundation/GoStatusTag.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      props: ['label', 'value'],
      setup: (props) => () => h('span', props.label || props.value),
    }),
  };
});

const capability = {
  action: 'read',
  key: 'tenant.member:read',
  resource: 'tenant.member',
};
const endpoints = {
  create: '/members/create',
  delete: '/members/delete',
  get: '/members/get',
  page: '/members/page',
  update: '/members/update',
};
const fields = [
  { field: 'name', label: '姓名' },
  {
    dictionaryKey: 'user.status',
    field: 'status',
    label: '状态',
    presentation: 'dictionary',
  },
  {
    displayField: 'department_name',
    field: 'department_id',
    label: '部门',
    presentation: 'reference',
  },
];

let app;
let recordId;
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
  recordId = ref('member-1');
  app = createApp({
    setup: () => () =>
      h(
        CapabilityProvider,
        { capabilities: [capability] },
        {
          default: () =>
            h(ResourceDetail, {
              authorizationResource: 'tenant.member',
              endpoints,
              fields,
              open: true,
              recordId: recordId.value,
            }),
        },
      ),
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  state.evaluate.mockReset();
  state.get.mockReset();
  state.evaluate.mockResolvedValue({
    items: [{ allowed: true, key: capability.key }],
  });
  state.get.mockResolvedValue({
    department_id: 'department-1',
    department_name: '研发部',
    id: 'member-1',
    name: 'Alice',
    status: 'active',
    version: 2,
  });
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('resource detail', () => {
  it('formats primitive and JSON fallback values', () => {
    expect(detailText(false)).toBe('否');
    expect(detailText(0)).toBe('0');
    expect(detailText(null)).toBe('—');
    expect(detailJSON({ scope: ['read'] })).toBe(
      '{\n  "scope": [\n    "read"\n  ]\n}',
    );
  });

  it('loads a fresh record and renders dictionary and reference fields', async () => {
    await mount();
    expect(state.get).toHaveBeenCalledWith('member-1', expect.any(AbortSignal));
    expect(root.textContent).toContain('Alice');
    expect(root.textContent).toContain('dictionary:active');
    expect(root.textContent).toContain('研发部');
    expect(root.textContent).toContain('version:2');
  });

  it('ignores an earlier response after the selected record changes', async () => {
    let resolveFirst;
    const first = new Promise((resolve) => (resolveFirst = resolve));
    state.get
      .mockReset()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ id: 'member-2', name: 'Bob', version: 1 });
    await mount();
    recordId.value = 'member-2';
    await flush();
    resolveFirst({ id: 'member-1', name: 'Alice', version: 2 });
    await flush();
    expect(root.textContent).toContain('Bob');
    expect(root.textContent).not.toContain('Alice');
  });

  it('fails closed without read permission', async () => {
    state.evaluate.mockResolvedValue({
      items: [{ allowed: false, key: capability.key }],
    });
    await mount();
    expect(state.get).not.toHaveBeenCalled();
    expect(root.textContent).toContain('当前账号无权查看该资源');
  });
});
