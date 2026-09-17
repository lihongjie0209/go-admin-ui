import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities } from '#/api/go';
import { usePageCapability } from '#/composables/use-page-capabilities';

import GoCapabilityProvider from './GoCapabilityProvider.vue';

vi.mock('#/api/go', () => ({
  evaluateCapabilities: vi.fn(),
}));

const evaluate = vi.mocked(evaluateCapabilities);

function capabilityConsumer(
  key = 'identity.user:update',
  resource = 'identity.user',
  action = 'update',
) {
  return defineComponent({
    setup() {
      const capability = usePageCapability({ action, key, resource });
      return () =>
        h('output', {
          'data-allowed': String(capability.allowed.value),
          'data-error': capability.error.value ? 'true' : 'false',
          'data-loading': String(capability.loading.value),
        });
    },
  });
}

describe('goCapabilityProvider', () => {
  beforeEach(() => {
    evaluate.mockReset();
  });

  it('keeps dynamically registered actions denied until evaluation allows them', async () => {
    let resolveEvaluation!: (value: {
      expires_at: string;
      items: Array<{ allowed: boolean; key: string }>;
      revision: string;
    }) => void;
    evaluate.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveEvaluation = resolve;
      }),
    );

    const Consumer = capabilityConsumer();
    const wrapper = mount(GoCapabilityProvider, {
      slots: { default: () => h(Consumer) },
    });
    await flushPromises();

    const output = wrapper.get('output');
    expect(output.attributes('data-allowed')).toBe('false');
    expect(output.attributes('data-loading')).toBe('true');
    expect(evaluate).toHaveBeenCalledWith([
      {
        action: 'update',
        key: 'identity.user:update',
        resource: 'identity.user',
      },
    ]);

    resolveEvaluation({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [{ allowed: true, key: 'identity.user:update' }],
      revision: '7',
    });
    await flushPromises();

    expect(output.attributes('data-allowed')).toBe('true');
    expect(output.attributes('data-loading')).toBe('false');
    expect(output.attributes('data-error')).toBe('false');
  });

  it('fails closed when the capability service is unavailable', async () => {
    evaluate.mockRejectedValueOnce(new Error('authorization unavailable'));

    const Consumer = capabilityConsumer();
    const wrapper = mount(GoCapabilityProvider, {
      slots: { default: () => h(Consumer) },
    });
    await flushPromises();

    const output = wrapper.get('output');
    expect(output.attributes('data-allowed')).toBe('false');
    expect(output.attributes('data-loading')).toBe('false');
    expect(output.attributes('data-error')).toBe('true');
  });

  it('fails closed when one key declares conflicting resource actions', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [],
      revision: '7',
    });
    const First = capabilityConsumer('shared-key', 'identity.user', 'read');
    const Second = capabilityConsumer('shared-key', 'tenant.member', 'read');
    const wrapper = mount(GoCapabilityProvider, {
      slots: { default: () => [h(First), h(Second)] },
    });
    await flushPromises();

    const outputs = wrapper.findAll('output');
    expect(outputs).toHaveLength(2);
    expect(
      outputs.every((item) => item.attributes('data-allowed') === 'false'),
    ).toBe(true);
    expect(
      outputs.some((item) => item.attributes('data-error') === 'true'),
    ).toBe(true);
  });

  it('reuses matching static declarations without reevaluating on consumer mount', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [{ allowed: true, key: 'identity.profile:read' }],
      revision: '8',
    });
    const Consumer = capabilityConsumer(
      'identity.profile:read',
      'identity.profile',
      'read',
    );

    const wrapper = mount(GoCapabilityProvider, {
      props: {
        capabilities: [
          {
            action: 'read',
            key: 'identity.profile:read',
            resource: 'identity.profile',
          },
        ],
      },
      slots: { default: () => h(Consumer) },
    });
    await flushPromises();

    expect(wrapper.get('output').attributes('data-allowed')).toBe('true');
    expect(evaluate).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a consumer conflicts with a static declaration', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [],
      revision: '8',
    });
    const Consumer = capabilityConsumer(
      'identity.profile:read',
      'identity.user',
      'read',
    );

    const wrapper = mount(GoCapabilityProvider, {
      props: {
        capabilities: [
          {
            action: 'read',
            key: 'identity.profile:read',
            resource: 'identity.profile',
          },
        ],
      },
      slots: { default: () => h(Consumer) },
    });
    await flushPromises();

    const output = wrapper.get('output');
    expect(output.attributes('data-allowed')).toBe('false');
    expect(output.attributes('data-error')).toBe('true');
  });
});
