import { createApp, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Viewer from '../../src/components/business/GoCodeViewer.vue';
const api = vi.hoisted(() => ({
  write: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@vben/icons', () => ({
  Check: { render: () => h('i', 'copied') },
  Copy: { render: () => h('i', 'copy') },
}));
vi.mock('ant-design-vue', () => ({
  message: api,
  Tooltip: { setup: (_, c) => () => h('div', c.slots.default?.()) },
  Button: {
    props: ['loading'],
    emits: ['click'],
    setup: (p, c) => () =>
      h(
        'button',
        { disabled: p.loading, onClick: () => c.emit('click') },
        c.slots.icon?.(),
      ),
  },
}));
let app, props, root;
const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await nextTick();
  }
};
async function mount(values = {}) {
  props = reactive(values);
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({ setup: () => () => h(Viewer, props) });
  app.mount(root);
  await flush();
}
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
beforeEach(() => {
  api.write.mockReset();
  api.success.mockReset();
  api.error.mockReset();
  vi.stubGlobal('navigator', { clipboard: { writeText: api.write } });
});
afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('真实高亮引擎转义 HTML，JSON 格式化及行号一致', async () => {
  await mount({
    code: { html: '<img src=x onerror=alert(1)>' },
    language: 'json',
  });
  expect(root.querySelector('img')).toBeNull();
  expect(root.querySelector('.hljs-attr')).not.toBeNull();
  expect(root.querySelector('code').textContent).toBe(
    JSON.stringify(props.code, null, 2),
  );
  expect(root.querySelectorAll('li')).toHaveLength(3);
});
it('切换语言和内容，非法 JSON 保留原文，空文本不报错', async () => {
  await mount({ code: '{broken', language: 'json' });
  expect(root.querySelector('code').textContent).toBe('{broken');
  props.code = '<script>alert(1)</script>';
  props.language = 'xml';
  await flush();
  expect(root.querySelector('script')).toBeNull();
  expect(root.querySelector('code').className).toBe('language-xml');
  props.code = '';
  props.showToolbar = false;
  props.showLineNumbers = false;
  await flush();
  expect(root.querySelector('code').textContent).toBe('');
  expect(root.querySelector('header')).toBeNull();
  expect(root.querySelector('ol')).toBeNull();
});
it('复制格式化后的可见文本，成功提示自动复位', async () => {
  vi.useFakeTimers();
  await mount({ code: '{"a":1}', language: 'json' });
  root.querySelector('button').click();
  await flush();
  expect(api.write).toHaveBeenCalledWith('{\n  "a": 1\n}');
  expect(api.success).toHaveBeenCalledWith('已复制');
  expect(root.textContent).toContain('copied');
  await vi.advanceTimersByTimeAsync(1500);
  expect(root.querySelector('i').textContent).toBe('copy');
});
it('剪贴板拒绝受控提示，重复点击不会重复写入', async () => {
  await mount({ code: 'hello' });
  api.write.mockRejectedValueOnce(new Error('denied'));
  root.querySelector('button').click();
  await flush();
  expect(api.error).toHaveBeenCalledWith('复制失败，请检查浏览器剪贴板权限');
  expect(api.success).not.toHaveBeenCalled();
  const pending = deferred();
  api.write.mockReturnValueOnce(pending.promise);
  root.querySelector('button').click();
  root.querySelector('button').click();
  await flush();
  expect(api.write).toHaveBeenCalledTimes(2);
  pending.resolve();
  await flush();
});
it('切换内容和卸载后，旧复制结果不能显示成功状态', async () => {
  await mount({ code: 'old' });
  const pending = deferred();
  api.write.mockReturnValueOnce(pending.promise);
  root.querySelector('button').click();
  props.code = 'new';
  await flush();
  pending.resolve();
  await flush();
  expect(api.success).not.toHaveBeenCalled();
  expect(root.querySelector('i').textContent).toBe('copy');
  const late = deferred();
  api.write.mockReturnValueOnce(late.promise);
  root.querySelector('button').click();
  app.unmount();
  app = undefined;
  late.resolve();
  await flush();
  expect(api.success).not.toHaveBeenCalled();
});
