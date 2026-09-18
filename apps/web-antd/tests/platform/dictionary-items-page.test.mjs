/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- page-composition stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DictionaryItemsPage from '../../src/views/platform/dictionary-items/index.vue';

const state = vi.hoisted(() => ({
  contract: null,
  pageProps: null,
  route: { params: {}, query: {} },
}));

vi.mock('vue-router', () => ({
  useRoute: () => state.route,
}));
vi.mock('@vben/common-ui', () => ({
  Page: defineComponent({
    props: ['description', 'title'],
    setup:
      (props, { slots }) =>
      () => {
        state.pageProps = { ...props };
        return h('main', slots.default?.());
      },
  }),
}));
vi.mock('../../src/templates/resource/FlatResourcePage.vue', () => ({
  default: defineComponent({
    props: ['contract'],
    setup: (props) => () => {
      state.contract = props.contract;
      return h('section');
    },
  }),
}));

let app;
let root;

async function mount() {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp(DictionaryItemsPage);
  app.mount(root);
  await nextTick();
}

beforeEach(() => {
  state.contract = null;
  state.pageProps = null;
  state.route.params = {};
  state.route.query = {};
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('dictionary items page', () => {
  it('does not issue an unscoped item query when the dictionary ID is absent', async () => {
    await mount();

    expect(state.pageProps.title).toBe('字典项');
    expect(state.contract).toBeNull();
    expect(root.querySelector('section')).toBeNull();
  });

  it('scopes the resource contract to the route dictionary and presents its name', async () => {
    state.route.params = { dictionaryId: 'dictionary-1' };
    state.route.query = { code: 'user-status', name: '用户状态' };
    await mount();

    expect(state.pageProps.title).toBe('用户状态 · 字典项');
    expect(state.contract.table.fixedFilters).toMatchObject({
      dictionary_id: 'dictionary-1',
    });
    expect(state.contract.editorInitialValues).toMatchObject({
      dictionary_id: 'dictionary-1',
    });
    expect(
      state.contract.editorFields.find((field) => field.field === 'parent_id'),
    ).toMatchObject({
      component: 'dictionary-tree',
      dictionaryKey: 'user-status',
    });
  });
});
