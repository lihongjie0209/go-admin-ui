import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: { hideInMenu: true, title: '平台管理' },
    name: 'PlatformInternal',
    path: '/platform',
    children: [
      {
        component: () => import('#/views/platform/dictionary-items/index.vue'),
        meta: { hideInMenu: true, title: '字典项' },
        name: 'PlatformDictionaryItems',
        path: 'dictionaries/:dictionaryId/items',
      },
      {
        component: () => import('#/views/platform/navigations/index.vue'),
        meta: { hideInMenu: true, title: '应用导航' },
        name: 'PlatformApplicationNavigations',
        path: 'applications/:applicationId/navigations',
      },
      {
        component: () =>
          import('#/views/platform/scheduled-job-runs/index.vue'),
        meta: { hideInMenu: true, title: '定时任务执行记录' },
        name: 'PlatformScheduledJobRuns',
        path: 'scheduled-jobs/:scheduledJobId/runs',
      },
    ],
  },
];

export default routes;
