import { flushPromises, mount } from '@vue/test-utils';

import { describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities } from '#/api/go';

import GoAccess from './GoAccess.vue';
import GoCapabilityProvider from './GoCapabilityProvider.vue';

vi.mock('#/api/go', () => ({ evaluateCapabilities: vi.fn() }));

const evaluate = vi.mocked(evaluateCapabilities);
const capability = {
  action: 'change-password',
  key: 'identity.credential:change-password',
  resource: 'identity.credential',
};

function subject() {
  return {
    components: { GoAccess, GoCapabilityProvider },
    setup: () => ({ capability }),
    template: `
      <GoCapabilityProvider :capabilities="[capability]">
        <GoAccess
          action="change-password"
          denied="message"
          denied-message="没有修改密码权限"
          resource="identity.credential"
        >
          <button>受保护操作</button>
        </GoAccess>
      </GoCapabilityProvider>
    `,
  };
}

describe('goAccess', () => {
  it('shows a concrete denial and does not render protected content', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [{ allowed: false, key: capability.key }],
      revision: '1',
    });

    const wrapper = mount(subject());
    await flushPromises();

    expect(wrapper.text()).toContain('没有修改密码权限');
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it('renders protected content only after capability approval', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [{ allowed: true, key: capability.key }],
      revision: '1',
    });

    const wrapper = mount(subject());
    await flushPromises();

    expect(wrapper.find('button').text()).toBe('受保护操作');
  });
});
