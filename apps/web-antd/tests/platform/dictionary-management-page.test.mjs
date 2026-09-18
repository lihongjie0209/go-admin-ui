/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- page-composition stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DictionariesPage from '../../src/views/platform/dictionaries/index.vue';

const state = vi.hoisted(() => ({
  contract: null,
  push: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: state.push }),
}));
vi.mock('@vben/common-ui', () => ({
  Page: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h('main', slots.default?.()),
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
  app = createApp(DictionariesPage);
  app.mount(root);
  await nextTick();
}

beforeEach(() => {
  state.contract = null;
  state.push.mockReset();
  state.push.mockResolvedValue(undefined);
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('dictionary management page', () => {
  it('declares dictionary-item list authorization and only exposes it for static dictionaries', async () => {
    await mount();

    expect(state.contract.capabilities).toContainEqual({
      action: 'list',
      key: 'dictionary.item:list',
      resource: 'dictionary.item',
    });
    const action = state.contract.table.rowActions.find(
      (item) => item.key === 'items',
    );
    expect(action.authorization).toEqual({
      action: 'list',
      key: 'dictionary.item:list',
      resource: 'dictionary.item',
    });
    expect(action.visible({ source: 'static' })).toBe(true);
    expect(action.visible({ source: 'provider' })).toBe(false);
  });

  it('opens the item page with stable identity and display context', async () => {
    await mount();
    const action = state.contract.table.rowActions.find(
      (item) => item.key === 'items',
    );

    await action.run({
      id: 'dictionary-1',
      code: 'user-status',
      name: '用户状态',
    });

    expect(state.push).toHaveBeenCalledWith({
      name: 'PlatformDictionaryItems',
      params: { dictionaryId: 'dictionary-1' },
      query: { code: 'user-status', name: '用户状态' },
    });
  });
});
