import { flushPromises, mount } from '@vue/test-utils';

import { beforeEach, expect, it, vi } from 'vitest';

import PermissionActionBinding from './PermissionActionBinding.vue';

const api = vi.hoisted(() => ({
  getPermissionActions: vi.fn(),
  loadScopedPermissionActionOptions: vi.fn(),
  setPermissionActions: vi.fn(),
  success: vi.fn(),
}));

vi.mock('#/api/go', () => ({
  getPermissionActions: api.getPermissionActions,
  setPermissionActions: api.setPermissionActions,
}));
vi.mock('#/modules/platform/authorization-options', () => ({
  loadScopedPermissionActionOptions: api.loadScopedPermissionActionOptions,
}));
vi.mock('ant-design-vue', () => ({
  Alert: { template: '<div />' },
  Button: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  Drawer: {
    props: ['open'],
    template: '<div v-if="open"><slot /><slot name="footer" /></div>',
  },
  Select: { template: '<div />' },
  Spin: { template: '<div><slot /></div>' },
  message: { success: api.success },
}));

const permission = {
  children: [],
  id: 'permission-id',
  is_system: false,
  key: 'permission-id',
  name: '用户管理',
  node_type: 'permission',
  resource: 'identity.user',
  version: 7,
};

beforeEach(() => {
  for (const mock of Object.values(api)) mock.mockReset();
  api.getPermissionActions.mockResolvedValue([
    { action_key: 'read', id: 'action-id', resource_key: 'identity.user' },
  ]);
  api.loadScopedPermissionActionOptions.mockResolvedValue([
    { label: 'identity.user:read · 读取', value: 'action-id' },
  ]);
  api.setPermissionActions.mockResolvedValue({});
});

it('saves linked actions with the selected permission optimistic version', async () => {
  const wrapper = mount(PermissionActionBinding, {
    global: {
      stubs: {
        GoAccess: { template: '<div><slot /></div>' },
      },
    },
    props: { selected: permission },
  });
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(api.loadScopedPermissionActionOptions).toHaveBeenCalledWith(
    'identity.user',
    expect.any(AbortSignal),
  );
  await wrapper.findAll('button').at(-1)?.trigger('click');
  await flushPromises();
  expect(api.setPermissionActions).toHaveBeenCalledWith('permission-id', 7, [
    'action-id',
  ]);
  expect(wrapper.emitted('saved')).toHaveLength(1);
  wrapper.unmount();
});

it('does not offer mutation for system permission nodes', () => {
  const wrapper = mount(PermissionActionBinding, {
    global: {
      stubs: {
        GoAccess: { template: '<div><slot /></div>' },
      },
    },
    props: { selected: { ...permission, is_system: true } },
  });
  expect(wrapper.find('button').exists()).toBe(false);
  expect(api.getPermissionActions).not.toHaveBeenCalled();
  wrapper.unmount();
});
