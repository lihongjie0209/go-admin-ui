import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DictionaryText from '../../src/components/foundation/GoDictionaryText.vue';

const api = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('../../src/api/go/dictionary-cache', () => ({
  loadDictionaryItems: api.load,
}));
vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  const Box = defineComponent({
    setup: (_, context) => () => h('span', context.slots.default?.()),
  });
  return { Skeleton: Box, Space: Box, Tag: Box };
});

let app;
let root;
let props;

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function flush() {
  for (let index = 0; index < 6; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount(values = {}) {
  props = reactive({
    dictionaryKey: 'identity.user-status',
    value: 'active',
    ...values,
  });
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({ setup: () => () => h(DictionaryText, props) });
  app.mount(root);
  await flush();
}

beforeEach(() => {
  api.load.mockReset();
});
afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('dictionary text foundation', () => {
  it('renders dictionary labels while retaining unknown values as a safe fallback', async () => {
    api.load.mockResolvedValue([
      { id: 'active', label: '启用', value: 'active' },
    ]);
    await mount({ value: ['active', 'legacy'] });
    expect(root.textContent).toContain('启用');
    expect(root.textContent).toContain('legacy');
  });

  it('ignores a stale dictionary response after the dictionary key changes', async () => {
    const old = deferred();
    api.load
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce([{ id: 'new', label: '新字典', value: 'active' }]);
    await mount();
    props.dictionaryKey = 'identity.account-status';
    await flush();
    old.resolve([{ id: 'old', label: '旧字典', value: 'active' }]);
    await flush();
    expect(root.textContent).toContain('新字典');
    expect(root.textContent).not.toContain('旧字典');
  });
});
