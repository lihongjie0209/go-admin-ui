/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- behavioral component stubs belong to this test */
import { createApp, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GrantDetail from '../../src/components/business/platform/TenantApplicationGrantDetail.vue';
import CapabilityProvider from '../../src/components/foundation/GoCapabilityProvider.vue';

const state = vi.hoisted(() => ({ evaluate: vi.fn(), get: vi.fn() }));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  evaluateCapabilities: state.evaluate,
}));
vi.mock('#/modules/platform/tenant-application-grants', () => ({
  getTenantApplicationGrant: state.get,
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
      setup: (props) => () => h('section', props.message),
    }),
    Button: Box,
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
    Tag: Box,
  };
});
vi.mock('../../src/components/foundation/GoAuditSummary.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      props: ['value'],
      setup: (props) => () => h('output', `audit:${props.value.version}`),
    }),
  };
});
vi.mock('../../src/components/foundation/GoDateTimeText.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      props: ['value'],
      setup: (props) => () => h('time', String(props.value ?? '-')),
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

const capability = {
  action: 'read',
  key: 'tenant.application-grant:read',
  resource: 'tenant.application-grant',
};
let app;
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
        { capabilities: [capability] },
        {
          default: () =>
            h(GrantDetail, {
              grantId: 'grant-1',
              open: true,
              tenantId: 'tenant-1',
            }),
        },
      ),
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  state.evaluate.mockReset().mockResolvedValue({
    items: [{ allowed: true, key: capability.key }],
  });
  state.get.mockReset().mockResolvedValue({
    application_code: 'console',
    application_home_path: '/console',
    application_id: 'application-1',
    application_name: '管理台',
    id: 'grant-1',
    status: 'active',
    tenant_id: 'tenant-1',
    tenant_name: '租户一',
    version: 3,
  });
});
afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('tenant application grant detail', () => {
  it('loads by both tenant and grant ID and renders presentation fields', async () => {
    await mount();
    expect(state.get).toHaveBeenCalledWith(
      'tenant-1',
      'grant-1',
      expect.any(AbortSignal),
    );
    expect(root.textContent).toContain('租户一');
    expect(root.textContent).toContain('管理台');
    expect(root.textContent).toContain('已授权');
    expect(root.textContent).toContain('audit:3');
  });

  it('fails closed when the read capability is denied', async () => {
    state.evaluate.mockResolvedValue({
      items: [{ allowed: false, key: capability.key }],
    });
    await mount();
    expect(state.get).not.toHaveBeenCalled();
    expect(root.textContent).toContain('当前账号无权查看应用授权详情');
  });
});
