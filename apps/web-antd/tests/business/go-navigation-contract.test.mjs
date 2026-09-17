import { describe, expect, it } from 'vitest';

import {
  mapNavigationTree,
  resolveNavigationComponent,
} from '../../src/api/core/menu';

describe('go navigation contract', () => {
  it('maps backend directories and menus without losing PBAC metadata', () => {
    const result = mapNavigationTree([
      {
        action: '',
        application_id: 'app-1',
        children: [
          {
            action: 'list',
            application_id: 'app-1',
            children: [],
            component: 'templates/resource/StandardResourcePage',
            icon: 'lucide:users',
            id: 'menu-1',
            metadata: {},
            name: '成员',
            navigation_key: 'members',
            navigation_type: 'menu',
            parent_id: 'directory-1',
            resource: 'tenant.member',
            route_path: '/members',
            sort_order: 1,
          },
        ],
        component: '',
        icon: 'lucide:settings',
        id: 'directory-1',
        metadata: {},
        name: '系统管理',
        navigation_key: 'system',
        navigation_type: 'directory',
        parent_id: null,
        resource: '',
        route_path: '',
        sort_order: 1,
      },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'directory-1', type: 'directory' });
    expect(result[1]).toMatchObject({
      action: 'list',
      parent_id: 'directory-1',
      resource: 'tenant.member',
      type: 'menu',
    });
  });
});

describe('navigation component resolution', () => {
  it('keeps the canonical compile-time component ID without appending another index', () => {
    expect(resolveNavigationComponent('platform/users/index')).toBe(
      '/platform/users/index',
    );
    expect(resolveNavigationComponent('/tenant/members/index.vue')).toBe(
      '/tenant/members/index',
    );
    expect(resolveNavigationComponent('')).toBeUndefined();
    expect(resolveNavigationComponent('platform/not-compiled/index')).toBe(
      '/_core/fallback/not-found',
    );
  });
});
