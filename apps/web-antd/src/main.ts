import { initPreferences, updatePreferences } from '@vben/preferences';
import { unmountGlobalLoading } from '@vben/utils';

import { loadPublicPlatformConfig } from './api/core/platform-config';
import { overridesPreferences, preferencesExtension } from './preferences';

/**
 * 应用初始化完成之后再进行页面加载渲染
 */
async function initApplication() {
  // name用于指定项目唯一标识
  // 用于区分不同项目的偏好设置以及存储数据的key前缀以及其他一些需要隔离的数据
  const env = import.meta.env.PROD ? 'prod' : 'dev';
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const namespace = `${import.meta.env.VITE_APP_NAMESPACE}-${appVersion}-${env}`;

  // app偏好设置初始化
  await initPreferences({
    extension: preferencesExtension,
    namespace,
    overrides: overridesPreferences,
  });
  // 这些属于产品级约束，不允许被历史浏览器偏好缓存重新开启。
  const platformConfig = await loadPublicPlatformConfig();
  const platformName = String(platformConfig['platform.name'] || '').trim();
  const platformLogo = String(platformConfig['platform.logo_url'] || '').trim();
  if (platformName) {
    const loadingTitle = document.querySelector<HTMLElement>(
      '#__app-loading__ .title',
    );
    if (loadingTitle) loadingTitle.textContent = platformName;
    document.title = platformName;
  }
  updatePreferences({
    app: {
      enablePreferences: false,
      ...(platformName ? { name: platformName } : {}),
    },
    ...(platformLogo
      ? { logo: { source: platformLogo, sourceDark: platformLogo } }
      : {}),
    theme: { mode: 'light' },
    widget: {
      fullscreen: false,
      fullscreenButtonPosition: 'none',
      notification: false,
      notificationButtonPosition: 'none',
      themeToggle: false,
      themeToggleButtonPosition: 'none',
    },
  });

  // 启动应用并挂载
  // vue应用主要逻辑及视图
  const { bootstrap } = await import('./bootstrap');
  await bootstrap(namespace);

  // 移除并销毁loading
  unmountGlobalLoading();
}

initApplication();
