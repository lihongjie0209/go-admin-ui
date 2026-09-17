import { createApp, h, nextTick, ref } from 'vue';

import { expect, it, vi } from 'vitest';

import { loadOfflineIconCollections } from '../../src/components/business/offline-icon-collections';

it('真实本地图标集合可注册并渲染三个图标族，不发起远程请求', async () => {
  const network = vi.fn(() =>
    Promise.reject(new Error('此测试禁止远程图标请求')),
  );
  vi.stubGlobal('fetch', network);
  let app;
  const root = document.createElement('div');
  try {
    const [{ addCollection }, { default: Icon }, collections] =
      await Promise.all([
        import('@vben/icons'),
        import('../../src/components/business/GoIcon.vue'),
        loadOfflineIconCollections(),
      ]);
    expect(collections.map((c) => c.prefix)).toEqual([
      'lucide',
      'carbon',
      'material-symbols',
    ]);
    expect(
      collections.reduce((sum, c) => sum + Object.keys(c.icons).length, 0),
    ).toBeGreaterThan(1000);
    collections.forEach((c) => addCollection(c));
    const icon = ref('lucide:user');
    app = createApp({ render: () => h(Icon, { icon: icon.value }) });
    app.mount(root);
    for (const value of [
      'lucide:user',
      'carbon:settings',
      'material-symbols:home',
    ]) {
      icon.value = value;
      for (let i = 0; i < 4; i++) await nextTick();
      const svg = root.querySelector('svg');
      expect(svg, `${value} should render`).not.toBeNull();
      expect(svg.children.length).toBeGreaterThan(0);
    }
    icon.value = '';
    await nextTick();
    expect(root.querySelector('svg')).toBeNull();
    expect(root.textContent).toBe('—');
    expect(network).not.toHaveBeenCalled();
  } finally {
    app?.unmount();
    root.remove();
    vi.unstubAllGlobals();
  }
});
