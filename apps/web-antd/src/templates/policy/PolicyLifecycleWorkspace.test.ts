import { shallowMount } from '@vue/test-utils';

import { describe, expect, it, vi } from 'vitest';

import PolicyLifecycleWorkspace from './PolicyLifecycleWorkspace.vue';

vi.mock('ant-design-vue', () => ({
  message: { error: vi.fn() },
}));

function mountWorkspace(scope: 'global' | 'tenant') {
  return shallowMount(PolicyLifecycleWorkspace, {
    global: {
      stubs: {
        GoResourceWorkspace: {
          name: 'GoResourceWorkspace',
          props: ['table'],
          template: '<div />',
        },
        PolicyDocumentDrawer: true,
        PolicyVersionsDrawer: true,
      },
    },
    props: {
      kind: { domain: 'pbac', scope },
    },
  });
}

describe('policy lifecycle workspace', () => {
  it('requires tenant context read access before offering tenant policy creation', () => {
    const workspace = mountWorkspace('tenant').findComponent({
      name: 'GoResourceWorkspace',
    });

    expect(workspace.props('table').createAuthorizations).toEqual([
      {
        action: 'read',
        key: 'tenant.context:read',
        resource: 'tenant.context',
      },
    ]);
  });

  it('does not require tenant context access for global policy creation', () => {
    const workspace = mountWorkspace('global').findComponent({
      name: 'GoResourceWorkspace',
    });

    expect(workspace.props('table').createAuthorizations).toEqual([]);
  });
});
