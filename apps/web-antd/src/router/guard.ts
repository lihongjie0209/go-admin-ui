import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { selectApplication } from '#/api/core/menu';
import {
  createNavigationTelemetryEvent,
  recordFrontendEventBestEffort,
} from '#/api/go/frontend-telemetry';
import {
  clearPasswordChangeRequired,
  clearRefreshToken,
  isPasswordChangeRequired,
} from '#/api/go/token-vault';
import { accessRoutes, coreRouteNames } from '#/router/routes';
import { clearPrincipalScopedState } from '#/security/principal-state';
import { useAuthStore } from '#/store';

import { generateAccess } from './access';

const CHANGE_PASSWORD_PATH = '/auth/change-password';

export function forcedPasswordRoute(
  path: string,
  hasAccessToken: boolean,
  required: boolean,
) {
  if (!hasAccessToken || !required || path === CHANGE_PASSWORD_PATH) return;
  return { path: CHANGE_PASSWORD_PATH, replace: true };
}

/**
 * 通用守卫配置
 * @param router
 */
function setupCommonGuard(router: Router) {
  // 记录已经加载的页面
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to, _from, failure) => {
    // 记录页面是否加载,如果已经加载，后续的页面切换动画等效果不在重复执行

    loadedPaths.add(to.path);

    // 关闭页面加载进度条
    if (preferences.transition.progress) {
      stopProgress();
    }
    if (to.meta.applicationId && to.meta.menuId) {
      localStorage.setItem('go-admin.current-menu-id', String(to.meta.menuId));
      const accessStore = useAccessStore();
      const event = createNavigationTelemetryEvent({
        applicationId: to.meta.applicationId,
        menuId: to.meta.menuId,
        path: to.path,
        routeName: to.name,
      });
      if (!failure && accessStore.accessToken && event) {
        void recordFrontendEventBestEffort(event);
      }
    }
  });
}

/**
 * 权限访问守卫配置
 * @param router
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    const clearInvalidSession = () => {
      accessStore.setAccessToken(null);
      accessStore.setRefreshToken(null);
      accessStore.setAccessCodes([]);
      accessStore.setAccessMenus([]);
      accessStore.setAccessRoutes([]);
      accessStore.setIsAccessChecked(false);
      accessStore.setLoginExpired(false);
      userStore.setUserInfo(null);
      clearPrincipalScopedState();
      clearPasswordChangeRequired();
      clearRefreshToken();
    };
    const redirectToLogin = () => ({
      path: LOGIN_PATH,
      query:
        to.fullPath === preferences.app.defaultHomePath
          ? {}
          : { redirect: encodeURIComponent(to.fullPath) },
      replace: true,
    });

    const passwordRedirect = forcedPasswordRoute(
      to.path,
      Boolean(accessStore.accessToken),
      isPasswordChangeRequired(),
    );
    if (passwordRedirect) return passwordRedirect;

    if (to.path === CHANGE_PASSWORD_PATH && !accessStore.accessToken) {
      return redirectToLogin();
    }

    // 基本路由，这些路由不需要进入权限拦截
    if (coreRouteNames.includes(to.name as string)) {
      const isApplicationFallback =
        to.name === 'FallbackNotFound' && to.path.startsWith('/app/');
      // 首次进入深链接时动态路由尚未注册，需要先继续生成路由；生成后仍然
      // 命中兜底路由，才说明当前用户确实无权访问该页面。
      if (
        isApplicationFallback &&
        accessStore.isAccessChecked &&
        accessStore.accessToken
      ) {
        return { path: '/403', replace: true };
      }
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        return decodeURIComponent(
          (to.query?.redirect as string) ||
            userStore.userInfo?.homePath ||
            preferences.app.defaultHomePath,
        );
      }
      if (!isApplicationFallback) return true;
    }

    // accessToken 检查
    if (!accessStore.accessToken) {
      // 明确声明忽略权限访问权限，则可以访问
      if (to.meta.ignoreAccess) {
        return true;
      }

      // 没有访问权限，跳转登录页面
      if (to.fullPath !== LOGIN_PATH) {
        return redirectToLogin();
      }
      return to;
    }

    // 是否已经生成过动态路由
    if (accessStore.isAccessChecked) {
      return true;
    }

    // 深链接、刷新和历史标签恢复时，以 URL 中的应用上下文为准。
    // 必须在生成动态菜单前同步，否则会为 localStorage 中的旧应用生成路由。
    const routeApplicationKey = to.path.match(/^\/app\/([^/]+)/)?.[1];
    if (routeApplicationKey) {
      await selectApplication(decodeURIComponent(routeApplicationKey));
    }

    // 生成路由表
    // 当前登录用户拥有的角色标识列表
    let userInfo = userStore.userInfo;
    if (!userInfo) {
      try {
        userInfo = await authStore.fetchUserInfo();
      } catch {
        clearInvalidSession();
        return redirectToLogin();
      }
    }
    const userRoles = userInfo.roles ?? [];

    // 生成菜单和路由
    const { accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      // 则会在菜单中显示，但是访问会被重定向到403
      routes: accessRoutes,
    });

    // 保存菜单信息和路由信息
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);
    const redirectPath = (from.query.redirect ??
      (to.path === preferences.app.defaultHomePath
        ? userInfo.homePath || preferences.app.defaultHomePath
        : to.fullPath)) as string;

    return {
      ...router.resolve(decodeURIComponent(redirectPath)),
      replace: true,
    };
  });
}

/**
 * 项目守卫配置
 * @param router
 */
function createRouterGuard(router: Router) {
  /** 通用 */
  setupCommonGuard(router);
  /** 权限访问 */
  setupAccessGuard(router);
}

export { createRouterGuard };
