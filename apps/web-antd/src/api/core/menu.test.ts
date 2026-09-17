import type { NavigationApplication } from './menu';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearApplicationContext,
  getApplicationHomePath,
  getMyMenuUsage,
  getNavigationApplications,
  invalidateApplicationCache,
} from './menu';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: { post } }));

describe('application navigation', () => {
  beforeEach(() => {
    post.mockReset();
    invalidateApplicationCache();
    localStorage.clear();
  });

  it('loads current-principal menu usage from the backend', async () => {
    const usage = [
      {
        application_id: 'app-1',
        click_count: 2,
        last_clicked_at: '2026-09-18T09:00:00+08:00',
        menu_id: 'menu-1',
      },
    ];
    post.mockResolvedValueOnce(usage);
    await expect(getMyMenuUsage()).resolves.toEqual(usage);
    expect(post).toHaveBeenCalledWith('/me/navigation-usage', {});
  });

  it('preserves the configured home path and backend application order', async () => {
    post.mockResolvedValueOnce([
      {
        code: 'reports',
        home_path: '/app/reports/overview',
        icon: 'lucide:chart',
        id: 'app-2',
        name: '报表',
        sort_order: 20,
      },
      {
        code: 'platform',
        home_path: '/app/platform/users',
        icon: 'lucide:settings',
        id: 'app-1',
        name: '平台',
        sort_order: 10,
      },
    ]);

    const applications = await getNavigationApplications();

    expect(
      applications.map(({ home_path, key }) => ({ home_path, key })),
    ).toEqual([
      { home_path: '/app/platform/users', key: 'platform' },
      { home_path: '/app/reports/overview', key: 'reports' },
    ]);
  });

  it('clears cached and persisted state when the principal boundary changes', async () => {
    post
      .mockResolvedValueOnce([
        {
          code: 'first-user',
          home_path: '',
          icon: '',
          id: 'app-1',
          name: '前一用户应用',
          sort_order: 1,
        },
      ])
      .mockResolvedValueOnce([]);
    localStorage.setItem('go-admin.current-application', 'first-user');
    localStorage.setItem('go-admin.current-menu-id', 'menu-1');
    localStorage.setItem('unrelated', 'keep');
    sessionStorage.setItem(
      'go-admin.application-tabs:first-user',
      JSON.stringify([{ path: '/app/first-user/home' }]),
    );
    sessionStorage.setItem('unrelated', 'keep');

    await expect(getNavigationApplications()).resolves.toHaveLength(1);
    clearApplicationContext();
    await expect(getNavigationApplications()).resolves.toEqual([]);

    expect(post).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('go-admin.current-application')).toBeNull();
    expect(localStorage.getItem('go-admin.current-menu-id')).toBeNull();
    expect(
      sessionStorage.getItem('go-admin.application-tabs:first-user'),
    ).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('uses a configured page as home and rejects paths outside registered menus', () => {
    const application: NavigationApplication = {
      description: '',
      home_path: '/app/platform/settings/tenants',
      icon: null,
      id: 'app-1',
      key: 'platform',
      name: '平台',
      type: 'platform',
      menus: [
        {
          component: null,
          icon: null,
          id: 'directory-1',
          key: 'settings',
          name: '设置',
          parent_id: null,
          route_path: '/settings',
          sort_order: 10,
          type: 'directory',
        },
        {
          component: 'platform/users/index',
          icon: null,
          id: 'menu-1',
          key: 'users',
          name: '用户',
          parent_id: 'directory-1',
          route_path: '/users',
          sort_order: 10,
          type: 'menu',
        },
        {
          component: 'platform/tenants/index',
          icon: null,
          id: 'menu-2',
          key: 'tenants',
          name: '租户',
          parent_id: 'directory-1',
          route_path: '/tenants',
          sort_order: 20,
          type: 'menu',
        },
      ],
    };

    expect(getApplicationHomePath(application)).toBe(
      '/app/platform/settings/tenants',
    );
    expect(
      getApplicationHomePath({
        ...application,
        home_path: '/app/another-application/admin',
      }),
    ).toBe('/app/platform/settings/users');
  });

  it('preserves every segment in an application-relative menu path', () => {
    const application: NavigationApplication = {
      description: '',
      home_path: '/app/platform/settings/reports/monthly',
      icon: null,
      id: 'app-1',
      key: 'platform',
      name: '平台',
      type: 'platform',
      menus: [
        {
          component: null,
          icon: null,
          id: 'directory-1',
          key: 'settings',
          name: '设置',
          parent_id: null,
          route_path: '/settings',
          sort_order: 10,
          type: 'directory',
        },
        {
          component: 'platform/runtime/index',
          icon: null,
          id: 'menu-1',
          key: 'monthly-report',
          name: '月报',
          parent_id: 'directory-1',
          route_path: '/reports/monthly',
          sort_order: 10,
          type: 'menu',
        },
      ],
    };

    expect(getApplicationHomePath(application)).toBe(
      '/app/platform/settings/reports/monthly',
    );
  });
});
