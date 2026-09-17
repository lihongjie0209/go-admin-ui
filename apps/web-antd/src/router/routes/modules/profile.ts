import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: { hideInMenu: true, title: '个人资料' },
    name: 'ProfileRoot',
    path: '/profile',
    children: [
      {
        component: () => import('#/views/_core/profile/index.vue'),
        meta: { hideInMenu: true, title: '个人资料' },
        name: 'Profile',
        path: '',
      },
    ],
  },
];

export default routes;
