/* eslint-disable vue/one-component-per-file, vue/require-prop-types -- page-composition stubs */
import { createApp, defineComponent, h, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FilesPage from '../../src/views/files/index.vue';

const state = vi.hoisted(() => ({
  contract: null,
  download: vi.fn(),
  open: vi.fn(),
  reload: vi.fn(),
  uploadAttrs: null,
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
    setup(props, { expose, slots }) {
      expose({ reload: state.reload });
      return () => {
        state.contract = props.contract;
        return h('section', slots.toolbar?.());
      };
    },
  }),
}));
vi.mock('../../src/components/business/GoFileUploadButton.vue', () => ({
  default: defineComponent({
    emits: ['uploaded'],
    setup:
      (_, { attrs, emit }) =>
      () => {
        state.uploadAttrs = attrs;
        return h('button', { onClick: () => emit('uploaded') }, 'upload');
      },
  }),
}));
vi.mock('../../src/modules/files/file-actions', () => ({
  openFileDownload: state.open,
  requestFileDownload: state.download,
}));

let app;
let root;

async function flush() {
  for (let index = 0; index < 4; index++) {
    await Promise.resolve();
    await nextTick();
  }
}

async function mount() {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp(FilesPage);
  app.mount(root);
  await flush();
}

beforeEach(() => {
  state.contract = null;
  state.uploadAttrs = null;
  state.download.mockReset();
  state.open.mockReset();
  state.reload.mockReset();
  state.download.mockResolvedValue({
    expires_at: '2026-09-18T12:00:00+08:00',
    file: { original_name: 'report.csv' },
    url: '/api/v1/files/content/download-token',
  });
});

afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('file management page', () => {
  it('requires download authorization and opens only the returned signed URL', async () => {
    await mount();
    const action = state.contract.table.rowActions.find(
      (item) => item.key === 'download',
    );

    expect(action.authorization).toEqual({
      action: 'download',
      key: 'file.object:download',
      resource: 'file.object',
    });
    expect(action.successMessage).toBe(false);
    await action.run({ id: 'file-1' });

    expect(state.download).toHaveBeenCalledWith('file-1');
    expect(state.open).toHaveBeenCalledWith(
      await state.download.mock.results[0].value,
    );
  });

  it('reloads the first page after a successful upload', async () => {
    await mount();

    root.querySelector('button').click();
    await flush();

    expect(state.reload).toHaveBeenCalledWith({ resetPage: true });
  });
});
