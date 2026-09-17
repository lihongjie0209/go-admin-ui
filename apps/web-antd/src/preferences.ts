import {
  appCopyrightPreferences,
  defineOverridesPreferences,
  definePreferencesExtension,
} from '@vben/preferences';

interface WebAntdPreferencesExtension {
  defaultTableSize: number;
  enableFormFullscreen: boolean;
  reportTitle: string;
  tenantMode: 'multi' | 'single';
}

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    accessMode: 'backend',
    compact: true,
    contentCompact: 'wide',
    defaultHomePath: '/platform/application',
    enableCheckUpdates: false,
    enablePreferences: false,
    locale: 'zh-CN',
    name: import.meta.env.VITE_APP_TITLE,
    timezone: 'Asia/Shanghai',
  },
  copyright: {
    ...appCopyrightPreferences,
    companyName: '企业 ERP 管理平台',
    enable: false,
  },
  header: {
    height: 44,
  },
  navigation: {
    styleType: 'plain',
  },
  sidebar: {
    collapseWidth: 52,
    extraCollapsedWidth: 52,
    width: 208,
  },
  tabbar: {
    height: 34,
    styleType: 'plain',
  },
  theme: {
    builtinType: 'default',
    colorPrimary: 'hsl(212 100% 45%)',
    fontSize: 14,
    mode: 'light',
    radius: '0.25',
  },
  widget: {
    fullscreen: false,
    fullscreenButtonPosition: 'none',
    languageToggle: false,
    notification: false,
    notificationButtonPosition: 'none',
    themeToggle: false,
    themeToggleButtonPosition: 'none',
    timezone: false,
  },
});

export const preferencesExtension =
  definePreferencesExtension<WebAntdPreferencesExtension>({
    tabLabel: 'preferences.antd.tabLabel',
    title: 'preferences.antd.title',
    fields: [
      {
        component: 'switch',
        defaultValue: true,
        key: 'enableFormFullscreen',
        label: 'preferences.antd.fields.enableFormFullscreen.label',
        tip: 'preferences.antd.fields.enableFormFullscreen.tip',
      },
      {
        component: 'select',
        defaultValue: 'single',
        key: 'tenantMode',
        label: 'preferences.antd.fields.tenantMode.label',
        options: [
          {
            label: 'preferences.antd.fields.tenantMode.options.single.label',
            value: 'single',
          },
          {
            label: 'preferences.antd.fields.tenantMode.options.multi.label',
            value: 'multi',
          },
        ],
      },
      {
        component: 'number',
        componentProps: {
          max: 200,
          min: 10,
          step: 10,
        },
        defaultValue: 20,
        key: 'defaultTableSize',
        label: 'preferences.antd.fields.defaultTableSize.label',
      },
      {
        component: 'input',
        defaultValue: '',
        key: 'reportTitle',
        label: 'preferences.antd.fields.reportTitle.label',
        placeholder: 'preferences.antd.fields.reportTitle.placeholder',
      },
    ],
  });
