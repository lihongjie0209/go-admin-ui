import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities } from '#/api/go';

import GoAuthorizedLoader from './GoAuthorizedLoader.vue';
import GoCapabilityProvider from './GoCapabilityProvider.vue';

vi.mock('#/api/go', () => ({
  evaluateCapabilities: vi.fn(),
}));

const evaluate = vi.mocked(evaluateCapabilities);
const authorization = {
  action: 'list',
  key: 'tenant.selection:list',
  resource: 'tenant.selection',
};

function subject(load: () => Promise<void>) {
  return defineComponent({
    setup() {
      return () =>
        h(
          GoCapabilityProvider,
          { capabilities: [authorization] },
          {
            default: () => h(GoAuthorizedLoader, { authorization, load }),
          },
        );
    },
  });
}

describe('goAuthorizedLoader', () => {
  it('loads once after the declared capability is granted', async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [{ allowed: true, key: authorization.key }],
      revision: '1',
    });

    mount(subject(load));
    await flushPromises();

    expect(load).toHaveBeenCalledTimes(1);
    expect(evaluate).toHaveBeenCalledTimes(1);
  });

  it('does not load when authorization is denied or unavailable', async () => {
    const deniedLoad = vi.fn().mockResolvedValue(undefined);
    evaluate.mockResolvedValueOnce({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [{ allowed: false, key: authorization.key }],
      revision: '1',
    });
    mount(subject(deniedLoad));
    await flushPromises();
    expect(deniedLoad).not.toHaveBeenCalled();

    const failedLoad = vi.fn().mockResolvedValue(undefined);
    evaluate.mockRejectedValueOnce(new Error('authorization unavailable'));
    mount(subject(failedLoad));
    await flushPromises();
    expect(failedLoad).not.toHaveBeenCalled();
  });
});
