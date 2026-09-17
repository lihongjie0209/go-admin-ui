import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import { pageCapabilityKey } from '#/composables/use-page-capabilities';

import GoAuthorizedActionButton from './GoAuthorizedActionButton.vue';

const { errorMessage, successMessage, trackFrontendAction } = vi.hoisted(
  () => ({
    errorMessage: vi.fn(),
    successMessage: vi.fn(),
    trackFrontendAction: vi.fn(
      async (_event: unknown, action: () => Promise<void>) => action(),
    ),
  }),
);

vi.mock('#/api/go', () => ({ trackFrontendAction }));
vi.mock('ant-design-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ant-design-vue')>();
  return {
    ...actual,
    message: { error: errorMessage, success: successMessage },
  };
});

const authorization = {
  action: 'update',
  key: 'identity.user:update',
  resource: 'identity.user',
};

function mountButton(allowed: boolean, run = vi.fn(async () => {})) {
  return {
    run,
    wrapper: mount(GoAuthorizedActionButton, {
      global: {
        provide: {
          [pageCapabilityKey as symbol]: {
            allowed: () => allowed,
            error: ref(),
            loading: ref(false),
            refresh: vi.fn(async () => {}),
            register: vi.fn(() => () => {}),
          },
        },
      },
      props: { authorization, label: '更新用户', run },
    }),
  };
}

describe('goAuthorizedActionButton', () => {
  it('does not render an undeclared or denied action', () => {
    const denied = mountButton(false);
    expect(denied.wrapper.find('button').exists()).toBe(false);
    expect(denied.run).not.toHaveBeenCalled();

    const missingProvider = mount(GoAuthorizedActionButton, {
      global: {
        stubs: { Button: true, Popconfirm: true },
      },
      props: { authorization, label: '更新用户', run: vi.fn(async () => {}) },
    });
    expect(missingProvider.find('button').exists()).toBe(false);
  });

  it('runs an allowed action through telemetry and emits completion', async () => {
    trackFrontendAction.mockClear();
    successMessage.mockClear();
    const { run, wrapper } = mountButton(true);

    await wrapper.get('button').trigger('click');

    expect(trackFrontendAction).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledOnce();
    expect(successMessage).toHaveBeenCalledWith('操作成功');
    expect(wrapper.emitted('completed')).toHaveLength(1);
  });

  it('does not emit completion when the action fails', async () => {
    errorMessage.mockClear();
    const failure = new Error('版本冲突，请刷新后重试');
    const { wrapper } = mountButton(
      true,
      vi.fn(async () => {
        throw failure;
      }),
    );

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(errorMessage).toHaveBeenCalledWith(failure.message);
    expect(wrapper.emitted('completed')).toBeUndefined();
  });
});
