import { flushPromises, mount } from '@vue/test-utils';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities } from '#/api/go';
import { getSelfProfile } from '#/modules/identity/self-profile';

import ProfilePage from './index.vue';

const push = vi.fn();

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
}));

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

vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ setUserInfo: vi.fn(), userInfo: undefined }),
}));

vi.mock('#/api/go', () => ({
  evaluateCapabilities: vi.fn(),
}));

vi.mock('#/modules/identity/self-profile', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('#/modules/identity/self-profile')>();
  return {
    ...original,
    getSelfProfile: vi.fn(),
    updateSelfProfile: vi.fn(),
  };
});

const evaluate = vi.mocked(evaluateCapabilities);
const loadProfile = vi.mocked(getSelfProfile);

describe('profilePage', () => {
  beforeEach(() => {
    push.mockReset();
    loadProfile.mockReset();
    evaluate.mockReset();
    loadProfile.mockResolvedValue({
      created_at: '2026-09-18T08:00:00+08:00',
      created_by: 'system',
      created_by_name: '系统',
      display_name: '测试用户',
      email: 'user@example.com',
      id: 'user-1',
      phone: '13800000000',
      status: 'active',
      updated_at: '2026-09-18T09:00:00+08:00',
      updated_by: 'user-1',
      updated_by_name: '测试用户',
      username: 'tester',
      version: 1,
    });
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        { allowed: true, key: 'identity.profile:read' },
        { allowed: true, key: 'identity.profile:update' },
        { allowed: true, key: 'identity.credential:change-password' },
        { allowed: false, key: 'identity.session:list' },
      ],
      revision: '1',
    });
  });

  it('only renders account-security entries allowed by PBAC', async () => {
    const wrapper = mount(ProfilePage);
    await flushPromises();

    expect(evaluate).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          action: 'change-password',
          key: 'identity.credential:change-password',
          resource: 'identity.credential',
        },
        {
          action: 'list',
          key: 'identity.session:list',
          resource: 'identity.session',
        },
      ]),
    );
    expect(wrapper.text()).toContain('修改密码');
    expect(wrapper.text()).not.toContain('会话管理');

    const changePasswordButton = wrapper
      .findAll('button')
      .find((button) => button.text() === '修改密码');
    expect(changePasswordButton).toBeDefined();
    if (!changePasswordButton) throw new Error('修改密码入口未渲染');
    await changePasswordButton.trigger('click');
    expect(push).toHaveBeenCalledWith('/auth/change-password');
  });

  it('does not load profile data before read permission is granted', async () => {
    evaluate.mockResolvedValue({
      expires_at: '2026-09-18T10:00:00+08:00',
      items: [
        { allowed: false, key: 'identity.profile:read' },
        { allowed: true, key: 'identity.profile:update' },
      ],
      revision: '2',
    });

    const wrapper = mount(ProfilePage);
    await flushPromises();

    expect(loadProfile).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('用户名');
  });
});
