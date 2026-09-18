import { flushPromises, mount } from '@vue/test-utils';

import { describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities } from '#/api/go';

import ChangePassword from './change-password.vue';

vi.mock('#/api/go', () => ({
  evaluateCapabilities: vi.fn(),
  trackFrontendAction: vi.fn(),
}));
vi.mock('#/store', () => ({
  useAuthStore: () => ({ logout: vi.fn() }),
}));

const evaluate = vi.mocked(evaluateCapabilities);

describe('change password page', () => {
  it('fails closed before exposing credential fields on a direct route visit', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        {
          allowed: false,
          key: 'identity.credential:change-password',
        },
      ],
      revision: '1',
    });

    const wrapper = mount(ChangePassword);
    await flushPromises();

    expect(evaluate).toHaveBeenCalledWith([
      {
        action: 'change-password',
        key: 'identity.credential:change-password',
        resource: 'identity.credential',
      },
    ]);
    expect(wrapper.text()).toContain('当前账号没有修改密码的权限');
    expect(wrapper.find('[aria-label="当前密码"]').exists()).toBe(false);
  });
});
