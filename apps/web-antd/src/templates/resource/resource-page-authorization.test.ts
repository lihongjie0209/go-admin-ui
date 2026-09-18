import { flushPromises, mount } from '@vue/test-utils';

import { describe, expect, it, vi } from 'vitest';

import { evaluateCapabilities } from '#/api/go';

import FlatResourcePage from './FlatResourcePage.vue';
import TreeResourcePage from './TreeResourcePage.vue';

vi.mock('#/api/go', () => ({ evaluateCapabilities: vi.fn() }));

const evaluate = vi.mocked(evaluateCapabilities);
const endpoints = {
  create: '/widgets/create',
  delete: '/widgets/delete',
  get: '/widgets/get',
  page: '/widgets/page',
  update: '/widgets/update',
};

function denyList() {
  evaluate.mockImplementation(async (requests) => ({
    expires_at: '2026-09-18T10:00:00+08:00',
    items: requests.map((request) => ({
      allowed: request.action !== 'list',
      key: request.key,
    })),
    revision: '1',
  }));
}

describe('resource page authorization boundaries', () => {
  it('does not mount flat query, toolbar, editor, or detail content when list is denied', async () => {
    denyList();
    const wrapper = mount(FlatResourcePage, {
      global: {
        stubs: {
          GoResourceDetail: { template: '<div data-detail />' },
          GoResourceEditor: { template: '<div data-editor />' },
          GoResourceWorkspace: { template: '<div data-workspace />' },
        },
      },
      props: {
        contract: {
          authorizationResource: 'widget',
          detailFields: [],
          editorFields: [],
          queryFields: [],
          table: { columns: [], endpoints },
        },
      },
      slots: { toolbar: '<button data-toolbar>新增</button>' },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('当前账号无权查看此资源列表');
    expect(wrapper.find('[data-workspace]').exists()).toBe(false);
    expect(wrapper.find('[data-editor]').exists()).toBe(false);
    expect(wrapper.find('[data-detail]').exists()).toBe(false);
    expect(wrapper.find('[data-toolbar]').exists()).toBe(false);
  });

  it('does not mount tree content or its editor when list is denied', async () => {
    denyList();
    const wrapper = mount(TreeResourcePage, {
      global: {
        stubs: {
          GoResourceEditor: { template: '<div data-editor />' },
          GoTreeResource: { template: '<div data-tree />' },
        },
      },
      props: {
        contract: {
          authorizationResource: 'widget-tree',
          editorFields: [],
          endpoints: { ...endpoints, tree: '/widgets/tree' },
        },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('当前账号无权查看此资源树');
    expect(wrapper.find('[data-tree]').exists()).toBe(false);
    expect(wrapper.find('[data-editor]').exists()).toBe(false);
  });
});
