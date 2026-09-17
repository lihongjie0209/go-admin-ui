import { createApp, nextTick } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import RuntimeStatusPanel from '../../src/components/business/platform/RuntimeStatusPanel.vue';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const { getRuntimeStatus } =
  await import('../../src/modules/platform/runtime-status.ts');

let app;
let root;

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

beforeEach(() => {
  api.post.mockReset();
});
afterEach(() => {
  app?.unmount();
  root?.remove();
});

describe('platform runtime status', () => {
  it('uses the protected management endpoint and propagates cancellation', async () => {
    const signal = new AbortController().signal;
    api.post.mockResolvedValue({ ready: true });

    await getRuntimeStatus(signal);

    expect(api.post).toHaveBeenCalledWith(
      '/platform/runtime/status',
      {},
      { signal },
    );
  });

  it('renders live dependency health and refreshes on demand', async () => {
    api.post
      .mockResolvedValueOnce({
        build: {
          build_time: '2026-09-18T01:00:00+08:00',
          commit: 'abc123',
          started_at: '2026-09-18T02:00:00+08:00',
          uptime: '1h2m3s',
          version: 'v1.2.3',
        },
        liveness: { status: 'up' },
        readiness: {
          dependencies: {
            database: { latency: '2ms', status: 'up' },
            redis: { latency: '1ms', status: 'down' },
          },
          status: 'not_ready',
        },
        ready: false,
      })
      .mockResolvedValueOnce({
        build: {
          build_time: '',
          commit: 'def456',
          started_at: '',
          uptime: '2h',
          version: 'v1.2.4',
        },
        liveness: { status: 'up' },
        readiness: { dependencies: {}, status: 'ready' },
        ready: true,
      });
    root = document.createElement('div');
    document.body.append(root);
    app = createApp(RuntimeStatusPanel);
    app.mount(root);
    await flush();

    expect(root.textContent).toContain('服务未就绪');
    expect(root.textContent).toContain('v1.2.3');
    expect(
      root.querySelector('[data-dependency="database"]')?.textContent,
    ).toContain('正常');
    expect(
      root.querySelector('[data-dependency="redis"]')?.textContent,
    ).toContain('不可用');

    root.querySelector('button')?.click();
    await flush();
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(root.textContent).toContain('服务就绪');
    expect(root.textContent).toContain('v1.2.4');
  });

  it('shows an actionable failure state', async () => {
    api.post.mockImplementation(async () => {
      await Promise.resolve();
      throw new Error('network unavailable');
    });
    root = document.createElement('div');
    document.body.append(root);
    app = createApp(RuntimeStatusPanel);
    app.mount(root);
    await flush();

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(root.textContent).toContain('运行状态加载失败');
    expect(root.textContent).toContain('network unavailable');
    expect(root.textContent).toContain('刷新状态');
  });
});
