import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';
import {
  isRegisteredPageComponent,
  normalizePageComponentID,
} from '#/modules/platform/page-component-registry';

export interface NavigationMenu {
  action?: string;
  action_permissions?: Record<string, string>;
  button_controlled?: boolean;
  component: null | string;
  icon: null | string;
  id: string;
  key: string;
  name: string;
  parent_id: null | string;
  route_path: null | string;
  resource?: string;
  sort_order: number;
  type: string;
}

export interface NavigationApplication {
  default_menu_id?: null | string;
  description?: null | string;
  home_path?: null | string;
  icon: null | string;
  id: string;
  key: string;
  menus: NavigationMenu[];
  name: string;
  type: 'organization' | 'platform';
}

export interface MenuUsage {
  application_id: string;
  click_count: number | string;
  last_clicked_at: string;
  menu_id: string;
}

const navigationCache = new Map<
  string,
  { expiresAt: number; value: NavigationApplication[] }
>();
const currentApplicationStorageKey = 'go-admin.current-application';

interface CurrentApplicationResponse {
  code: string;
  home_path: string;
  icon: string;
  id: string;
  name: string;
  sort_order: number;
}

interface NavigationNodeResponse {
  action: string;
  application_id: string;
  children: NavigationNodeResponse[];
  component: string;
  icon: string;
  id: string;
  metadata: Record<string, unknown>;
  name: string;
  navigation_key: string;
  navigation_type: string;
  parent_id?: null | string;
  resource: string;
  route_path: string;
  sort_order: number;
}

export function mapNavigationTree(
  nodes: NavigationNodeResponse[],
): NavigationMenu[] {
  return nodes
    .toSorted(
      (left, right) =>
        left.sort_order - right.sort_order || left.id.localeCompare(right.id),
    )
    .flatMap((node) => [
      {
        action: node.action,
        action_permissions: {},
        button_controlled: Boolean(node.resource && node.action),
        component: node.component || null,
        icon: node.icon || null,
        id: node.id,
        key: node.navigation_key,
        name: node.name,
        parent_id: node.parent_id ?? null,
        route_path: node.route_path || null,
        resource: node.resource,
        sort_order: node.sort_order,
        type: node.navigation_type,
      },
      ...mapNavigationTree(node.children ?? []),
    ]);
}

export async function getNavigationApplications() {
  const scope = 'current-principal';
  const cached = navigationCache.get(scope);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const applications = await requestClient.post<CurrentApplicationResponse[]>(
    '/me/applications',
    {},
  );
  const value = applications
    .toSorted(
      (left, right) =>
        left.sort_order - right.sort_order || left.id.localeCompare(right.id),
    )
    .map((application) => ({
      description: '',
      home_path: application.home_path || null,
      icon: application.icon || null,
      id: application.id,
      key: application.code,
      menus: [],
      name: application.name,
      type: 'organization' as const,
    }));
  navigationCache.set(scope, { expiresAt: Date.now() + 60_000, value });
  return value;
}

export async function getMyMenuUsage() {
  return requestClient.post<MenuUsage[]>('/me/navigation-usage', {});
}

export function invalidateApplicationCache() {
  navigationCache.clear();
}

export async function getCurrentApplication() {
  const applications = await getNavigationApplications();
  const persistedKey = localStorage.getItem(currentApplicationStorageKey);
  let serverCurrent: null | { application_id?: string } = null;
  try {
    serverCurrent = await requestClient.post<{ application_id?: string }>(
      '/me/application/current',
      {},
    );
  } catch {
    // A missing current context is valid before the first application switch.
  }
  const application =
    applications.find((item) => item.id === serverCurrent?.application_id) ??
    applications.find((item) => item.key === persistedKey) ??
    null;
  if (!application) return null;
  localStorage.setItem(currentApplicationStorageKey, application.key);
  if (application.menus.length === 0) {
    const nodes = await requestClient.post<NavigationNodeResponse[]>(
      '/me/navigations',
      {
        application_id: application.id,
      },
    );
    application.menus = mapNavigationTree(nodes);
  }
  return application;
}

export async function selectApplication(applicationKey: string) {
  const applications = await getNavigationApplications();
  const application = applications.find((item) => item.key === applicationKey);
  if (!application) throw new Error('无权访问该应用');
  let version = 0;
  let currentApplicationID = '';
  try {
    const current = await requestClient.post<{
      application_id?: string;
      version: number;
    }>('/me/application/current', {});
    version = current.version;
    currentApplicationID = current.application_id ?? '';
  } catch {
    // The switch endpoint accepts version 0 when no current context exists.
  }
  if (currentApplicationID !== application.id) {
    await requestClient.post('/me/application/switch', {
      application_id: application.id,
      version,
    });
  }
  const nodes = await requestClient.post<NavigationNodeResponse[]>(
    '/me/navigations',
    {
      application_id: application.id,
    },
  );
  application.menus = mapNavigationTree(nodes);
  localStorage.setItem(currentApplicationStorageKey, applicationKey);
}

export function getApplicationHomePath(application: NavigationApplication) {
  const routes = buildMenuTree(application.menus ?? [], application);
  const findPage = (
    items: RouteRecordStringComponent[],
    preferredMenuId?: null | string,
    preferredPath?: string,
  ): string | undefined => {
    for (const item of items) {
      if (
        item.component &&
        (!preferredMenuId || item.meta?.menuId === preferredMenuId) &&
        (!preferredPath || item.path === preferredPath)
      ) {
        return item.path;
      }
      const childPath = item.children
        ? findPage(item.children, preferredMenuId, preferredPath)
        : undefined;
      if (childPath) return childPath;
    }
  };
  const configuredHomePath = String(application.home_path ?? '').trim();
  if (configuredHomePath && findPage(routes, undefined, configuredHomePath)) {
    return configuredHomePath;
  }
  return (
    (application.default_menu_id
      ? findPage(routes, application.default_menu_id)
      : undefined) ??
    findPage(routes) ??
    '/apps'
  );
}

export function resolveNavigationComponent(component: string) {
  const normalized = normalizePageComponentID(component);
  if (!normalized) return undefined;
  return isRegisteredPageComponent(normalized)
    ? `/${normalized}`
    : '/_core/fallback/not-found';
}

function buildMenuTree(
  menus: NavigationMenu[],
  application: NavigationApplication,
) {
  const visible = menus.filter(
    (item) => item.type !== 'action' && item.type !== 'button',
  );
  const children = new Map<null | string, NavigationMenu[]>();
  for (const menu of visible) {
    const list = children.get(menu.parent_id) ?? [];
    list.push(menu);
    children.set(menu.parent_id, list);
  }

  const mapNode = (
    menu: NavigationMenu,
    parentPath = `/app/${application.key}`,
  ): RouteRecordStringComponent => {
    const segment =
      String(menu.route_path ?? menu.key)
        .split('/')
        .findLast((value) => value.length > 0) ?? menu.key;
    const path = `${parentPath}/${segment}`;
    const route = {
      meta: {
        icon: menu.icon || undefined,
        applicationId: application.id,
        applicationKey: application.key,
        menuId: menu.id,
        permissionAction: menu.action || undefined,
        permissionResource: menu.resource || undefined,
        buttonControlled: menu.button_controlled ?? false,
        crudPermissions: menu.action_permissions ?? {},
        order: menu.sort_order,
        title: menu.name,
      },
      name: `${application.key}_${menu.key}`.replaceAll('-', '_'),
      path,
      children: children.get(menu.id)?.map((child) => mapNode(child, path)),
    } as unknown as RouteRecordStringComponent;
    // 应用根节点已经承载 BasicLayout；目录只负责分组。给目录再次配置
    // BasicLayout 会在内容区域内嵌套渲染整套后台框架。
    if (menu.component) {
      const component = resolveNavigationComponent(menu.component);
      if (component) route.component = component;
    }
    return route;
  };

  return (children.get(null) ?? []).map((menu) => mapNode(menu));
}

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  const application = await getCurrentApplication();
  return application ? buildMenuTree(application.menus ?? [], application) : [];
}
