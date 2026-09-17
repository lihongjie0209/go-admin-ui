import { createApp, h, nextTick } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('#/composables/use-page-capabilities', () => ({
  usePageCapability: () => ({ allowed: { value: true } }),
}));
vi.mock('#/modules/files/file-actions', () => ({ uploadFile: state.upload }));
vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    Button: defineComponent({
      setup:
        (_, { attrs, slots }) =>
        () =>
          h('button', attrs, slots.default?.()),
    }),
    message: { error: state.error, success: state.success },
  };
});

const uploadButtonModule =
  await import('../../src/components/business/GoFileUploadButton.vue');
const UploadButton = uploadButtonModule.default;

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

let app;
let root;
let uploaded;

async function mount() {
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({
    render: () =>
      h(UploadButton, {
        onUploaded: (record) => uploaded.push(record),
      }),
  });
  app.mount(root);
  await nextTick();
}

function select(file) {
  const input = root.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });
  input.dispatchEvent(new Event('change'));
}

beforeEach(() => {
  state.error.mockReset();
  state.success.mockReset();
  state.upload.mockReset();
  uploaded = [];
});

afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  root = undefined;
});

it('uploads once, reports success and emits the created record', async () => {
  state.upload.mockResolvedValueOnce({ id: 'file-1', version: 1 });
  await mount();
  const file = new File(['content'], 'report.txt');

  select(file);
  await vi.waitFor(() => expect(uploaded).toHaveLength(1));

  expect(state.upload).toHaveBeenCalledExactlyOnceWith(
    file,
    expect.any(AbortSignal),
  );
  expect(state.success).toHaveBeenCalledWith('文件上传成功');
  expect(uploaded).toEqual([{ id: 'file-1', version: 1 }]);
});

it('ignores a second selection while the first upload is running', async () => {
  const pending = deferred();
  state.upload.mockReturnValueOnce(pending.promise);
  await mount();

  select(new File(['first'], 'first.txt'));
  select(new File(['second'], 'second.txt'));
  expect(state.upload).toHaveBeenCalledTimes(1);
  pending.resolve({ id: 'file-1' });
  await vi.waitFor(() => expect(uploaded).toHaveLength(1));
});

it('aborts an in-flight upload and suppresses stale UI updates on unmount', async () => {
  let signal;
  state.upload.mockImplementationOnce((_file, currentSignal) => {
    signal = currentSignal;
    return new Promise((_resolve, reject) => {
      currentSignal.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError')),
      );
    });
  });
  await mount();

  select(new File(['content'], 'report.txt'));
  await vi.waitFor(() => expect(state.upload).toHaveBeenCalledOnce());
  app.unmount();
  await nextTick();

  expect(signal.aborted).toBe(true);
  expect(state.success).not.toHaveBeenCalled();
  expect(state.error).not.toHaveBeenCalled();
  expect(uploaded).toEqual([]);
  app = undefined;
});
