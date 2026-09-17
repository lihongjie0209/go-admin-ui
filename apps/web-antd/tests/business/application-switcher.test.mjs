import { createApp, h, KeepAlive, nextTick, reactive, ref } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import Switcher from '../../src/components/business/GoApplicationSwitcher.vue';

const api = vi.hoisted(() => ({
  navigation: vi.fn(),
  usage: vi.fn(),
  select: vi.fn(),
  organization: vi.fn(),
  replace: vi.fn(),
  resetRoutes: vi.fn(),
  tabReset: vi.fn(),
  setMenus: vi.fn(),
  setRoutes: vi.fn(),
  setChecked: vi.fn(),
  error: vi.fn(),
  route: { fullPath: '/app/current/list' },
  tabs: [{ path: '/app/current/list' }, { path: '/app/other/stale' }],
}));
vi.mock('vue-router', () => ({ useRoute: () => api.route }));
vi.mock('@vben/icons', () => ({ IconifyIcon: { render: () => null } }));
vi.mock('@vben/stores', () => ({
  useTabbarStore: () => ({ tabs: api.tabs, $reset: api.tabReset }),
  useAccessStore: () => ({
    setAccessMenus: api.setMenus,
    setAccessRoutes: api.setRoutes,
    setIsAccessChecked: api.setChecked,
  }),
}));
vi.mock('#/api/core/menu', () => ({
  getNavigationApplications: api.navigation,
  getMyMenuUsage: api.usage,
  selectApplication: api.select,
}));
vi.mock('#/router', () => ({
  resetRoutes: api.resetRoutes,
  router: { replace: api.replace },
}));
vi.mock('ant-design-vue', async () => {
  const { defineComponent, h } = await import('vue');
  const box = defineComponent({
    props: ['open'],
    setup: (p, c) => () =>
      p.open === false ? null : h('div', c.slots.default?.()),
  });
  const search = defineComponent({
    props: ['value'],
    emits: ['update:value'],
    setup: (p, c) => () =>
      h('input', {
        'data-search': true,
        value: p.value,
        onInput: (e) => c.emit('update:value', e.target.value),
      }),
  });
  search.Search = search;
  return {
    Empty: box,
    Input: search,
    Modal: box,
    Pagination: box,
    Spin: box,
    Tag: box,
    message: api,
  };
});
const menu = (id, path = '/list', parent_id = null, sort_order = 1) => ({
  id,
  key: id,
  route_path: path,
  parent_id,
  sort_order,
  component: '/view',
});
const application = (key, name = key, menus = [menu(`${key}-menu`)]) => ({
  id: `id-${key}`,
  key,
  name,
  description: `${name}说明`,
  type: key === 'platform' ? 'platform' : 'organization',
  menus,
});
const deferred = () => {
  let reject, resolve;
  const promise = new Promise((ok, no) => {
    resolve = ok;
    reject = no;
  });
  return { promise, resolve, reject };
};
const flush = async () => {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve();
    await nextTick();
  }
};
let active, app, props, root;
async function mount(current = 'current') {
  props = reactive({ open: false, currentApplicationKey: current });
  active = ref(true);
  root = document.createElement('div');
  document.body.append(root);
  app = createApp({
    setup: () => () =>
      h(KeepAlive, null, {
        default: () =>
          active.value
            ? h(Switcher, {
                ...props,
                'onUpdate:open': (v) => {
                  props.open = v;
                },
              })
            : h('div', '其他页面'),
      }),
  });
  app.mount(root);
  props.open = true;
  await flush();
}
beforeEach(() => {
  for (const key of [
    'navigation',
    'usage',
    'select',
    'organization',
    'replace',
    'resetRoutes',
    'tabReset',
    'setMenus',
    'setRoutes',
    'setChecked',
    'error',
  ])
    api[key].mockReset();
  api.tabs.splice(
    0,
    api.tabs.length,
    { path: '/app/current/list' },
    { path: '/app/other/stale' },
  );
  api.navigation.mockResolvedValue([
    application('current', '当前应用'),
    application('workflow-center', '工作流中心'),
    application('hidden', '无菜单', []),
  ]);
  api.usage.mockResolvedValue([
    {
      application_id: 'id-workflow-center',
      click_count: 8,
      last_clicked_at: '2026-09-07T01:00:00Z',
    },
  ]);
  api.organization.mockResolvedValue({ id: 'org-a' });
  api.select.mockResolvedValue(undefined);
  api.replace.mockResolvedValue(undefined);
  sessionStorage.clear();
});
afterEach(() => {
  app?.unmount();
  root?.remove();
  app = undefined;
  sessionStorage.clear();
});

it('展示后端授权的应用，并按使用频率排序且支持模糊搜索', async () => {
  await mount();
  const buttons = [...root.querySelectorAll('button')];
  expect(buttons.map((item) => item.textContent)).toEqual([
    '工作流中心组织级工作流中心说明',
    '当前应用组织级当前当前应用说明',
    '无菜单组织级无菜单说明',
  ]);
  const input = root.querySelector('[data-search]');
  input.value = '当前';
  input.dispatchEvent(new Event('input'));
  await flush();
  expect(
    [...root.querySelectorAll('button')].map((item) => item.textContent),
  ).toEqual(['当前应用组织级当前当前应用说明']);
});

it('切换工作流应用使用应用内默认首个菜单，不刷新整个页面', async () => {
  await mount();
  root.querySelectorAll('button')[0].click();
  await flush();
  expect(api.select).toHaveBeenCalledExactlyOnceWith('workflow-center');
  expect(api.replace).toHaveBeenCalledExactlyOnceWith(
    '/app/workflow-center/list',
  );
  expect(api.tabReset).toHaveBeenCalledTimes(1);
  expect(api.resetRoutes).toHaveBeenCalledTimes(1);
  expect(api.setChecked).toHaveBeenCalledWith(false);
  expect(props.open).toBe(false);
  const saved = JSON.parse(
    sessionStorage.getItem('go-admin.application-tabs:current'),
  );
  expect(saved.lastPath).toBe('/app/current/list');
  expect(saved.tabs).toHaveLength(2);
});

it('优先恢复目标应用自己的路径和 Tab，并丢弃其他应用 Tab', async () => {
  sessionStorage.setItem(
    'go-admin.application-tabs:workflow-center',
    JSON.stringify({
      lastPath: '/app/workflow-center/todo',
      tabs: [
        { path: '/app/workflow-center/todo' },
        { path: '/app/current/list' },
      ],
    }),
  );
  await mount();
  root.querySelectorAll('button')[0].click();
  await flush();
  expect(api.replace).toHaveBeenCalledWith('/app/workflow-center/todo');
});

it('服务端切换失败保留当前 Tab、路由和弹框，错误可见且允许重试', async () => {
  api.select.mockRejectedValueOnce(new Error('无权切换到该应用'));
  await mount();
  root.querySelectorAll('button')[0].click();
  await flush();
  expect(api.error).toHaveBeenCalledWith('无权切换到该应用');
  expect(api.tabReset).not.toHaveBeenCalled();
  expect(api.resetRoutes).not.toHaveBeenCalled();
  expect(api.replace).not.toHaveBeenCalled();
  expect(props.open).toBe(true);
  api.select.mockResolvedValue(undefined);
  root.querySelectorAll('button')[0].click();
  await flush();
  expect(api.select).toHaveBeenCalledTimes(2);
  expect(props.open).toBe(false);
});

it('连续点击只执行一次上下文切换', async () => {
  const pending = deferred();
  api.select.mockReturnValue(pending.promise);
  await mount();
  const button = root.querySelectorAll('button')[0];
  button.click();
  button.click();
  await flush();
  expect(api.select).toHaveBeenCalledTimes(1);
  expect(button.disabled).toBe(true);
  pending.resolve();
  await flush();
  expect(api.replace).toHaveBeenCalledTimes(1);
});

it('关闭或缓存页停用后旧列表响应不能写入，再打开重新加载', async () => {
  const old = deferred();
  api.navigation.mockReturnValueOnce(old.promise);
  await mount();
  props.open = false;
  await flush();
  old.resolve([application('stale', '旧应用')]);
  await flush();
  props.open = true;
  await flush();
  expect(root.textContent).not.toContain('旧应用');
  expect(api.navigation).toHaveBeenCalledTimes(2);
  active.value = false;
  await flush();
  expect(props.open).toBe(false);
  active.value = true;
  await flush();
  expect(root.textContent).not.toContain('工作流中心');
});

it('应用列表加载失败清空旧结果并展示中文错误', async () => {
  api.navigation.mockRejectedValueOnce(new Error('导航服务不可用'));
  await mount();
  expect(api.error).toHaveBeenCalledWith('导航服务不可用');
  expect(root.querySelectorAll('button')).toHaveLength(0);
  expect(root.textContent).not.toContain('工作流中心');
});
