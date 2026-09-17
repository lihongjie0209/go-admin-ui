import { flushPromises, mount } from '@vue/test-utils';

import { describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities } from '#/api/go';
import { getRuntimeStatus } from '#/modules/platform/runtime-status';

import RuntimePage from './index.vue';

vi.mock('@vben/common-ui', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    Page: defineComponent({
      setup(_, { slots }) {
        return () => h('main', slots.default?.());
      },
    }),
  };
});

vi.mock('#/api/go', () => ({
  evaluateCapabilities: vi.fn(),
}));

vi.mock('#/modules/platform/runtime-status', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('#/modules/platform/runtime-status')
  >()),
  getRuntimeStatus: vi.fn(),
}));

const evaluate = vi.mocked(evaluateCapabilities);
const loadStatus = vi.mocked(getRuntimeStatus);

describe('runtimePage', () => {
  it('does not request operational status when read capability is denied', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [{ allowed: false, key: 'platform.runtime:read' }],
      revision: '1',
    });

    const wrapper = mount(RuntimePage);
    await flushPromises();

    expect(evaluate).toHaveBeenCalledWith([
      {
        action: 'read',
        key: 'platform.runtime:read',
        resource: 'platform.runtime',
      },
    ]);
    expect(loadStatus).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('刷新状态');
  });
});
