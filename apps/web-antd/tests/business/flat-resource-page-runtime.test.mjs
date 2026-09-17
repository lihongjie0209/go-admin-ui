/* eslint-disable vue/one-component-per-file -- integration-only component stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FlatResourcePage from '../../src/templates/resource/FlatResourcePage.vue';

const state = vi.hoisted(() => ({
  create: vi.fn(),
  delete: vi.fn(),
  evaluate: vi.fn(),
  page: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../../src/api/go', async (loadOriginal) => ({
  ...(await loadOriginal()),
  createResourceApi: () => ({
    create: state.create,
    delete: state.delete,
    page: state.page,
    update: state.update,
  }),
  evaluateCapabilities: state.evaluate,
}));
vi.mock('../../src/components/business/GoResourceEditor.vue', () => ({
  default: defineComponent({ render: () => h('aside') }),
}));
vi.mock('../../src/components/business/GoResourceDetail.vue', () => ({
  default: defineComponent({ render: () => h('aside') }),
}));

const contract = {
  authorizationResource: 'identity.user',
  detailFields: [],
  editorFields: [],
  queryFields: [],
  table: {
    columns: [{ field: 'name', title: '名称' }],
    endpoints: {
      create: '/users/create',
      delete: '/users/delete',
      get: '/users/get',
      page: '/users/page',
      update: '/users/update',
    },
  },
};

let app;
let root;

async function flush() {
  for (let index = 0; index < 15; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

beforeEach(() => {
  for (const mock of Object.values(state)) mock.mockReset();
  state.evaluate.mockImplementation(async (requests) => ({
    expires_at: '2026-09-18T10:00:00+08:00',
    items: requests.map(({ key }) => ({ allowed: true, key })),
    revision: 'runtime-test',
  }));
  state.page.mockResolvedValue({ items: [], total: 0 });
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('flat resource page runtime composition', () => {
  it('renders create after the shared capability provider resolves', async () => {
    root = document.createElement('div');
    document.body.append(root);
    app = createApp(FlatResourcePage, { contract });
    app.mount(root);
    await flush();

    expect(state.evaluate).toHaveBeenCalled();
    const create = root.querySelector('button[aria-label="新增"]');
    expect(create).not.toBeNull();
    expect(create.textContent.replaceAll(' ', '')).toBe('新增');
  });
});
