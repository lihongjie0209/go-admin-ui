import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CapabilityProvider from '../../src/components/foundation/GoCapabilityProvider.vue';
import { usePageCapability } from '../../src/composables/use-page-capabilities';

const api = vi.hoisted(() => ({ evaluate: vi.fn() }));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  evaluateCapabilities: api.evaluate,
}));

const createCapability = {
  action: 'create',
  key: 'tenant.member:create',
  resource: 'tenant.member',
};
const updateCapability = {
  action: 'update',
  key: 'tenant.member:update',
  resource: 'tenant.member',
};

const CapabilityButton = defineComponent({
  props: {
    action: { type: String, required: true },
    capabilityKey: { type: String, required: true },
  },
  setup(props) {
    const capability = usePageCapability({
      action: props.action,
      key: props.capabilityKey,
      resource: 'tenant.member',
    });
    return () =>
      capability.allowed.value
        ? h('button', { 'data-capability': props.capabilityKey }, props.action)
        : null;
  },
});

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
        { capabilities: [createCapability, updateCapability] },
        {
          default: () => [
            h(CapabilityButton, {
              action: 'create',
              capabilityKey: createCapability.key,
            }),
            h(CapabilityButton, {
              action: 'update',
              capabilityKey: updateCapability.key,
            }),
          ],
        },
      ),
  });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  api.evaluate.mockReset();
});

afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  root = undefined;
});

describe('page capability registry', () => {
  it('batches page declarations and child registrations into one evaluation', async () => {
    api.evaluate.mockResolvedValue({
      expires_at: '2026-09-17T10:00:30+08:00',
      items: [
        { allowed: true, key: createCapability.key },
        { allowed: false, key: updateCapability.key },
      ],
      revision: 'policy-1',
    });

    await mount();

    expect(api.evaluate).toHaveBeenCalledTimes(1);
    expect(api.evaluate).toHaveBeenCalledWith([
      createCapability,
      updateCapability,
    ]);
    expect(
      root.querySelector(`[data-capability="${createCapability.key}"]`),
    ).not.toBeNull();
    expect(
      root.querySelector(`[data-capability="${updateCapability.key}"]`),
    ).toBeNull();
  });

  it('fails closed when the batch evaluation is unavailable', async () => {
    api.evaluate.mockRejectedValue(new Error('authorization unavailable'));

    await mount();

    expect(root.querySelectorAll('button')).toHaveLength(0);
  });
});
