<script setup lang="ts">
import type { UserSecurityTarget } from '#/modules/identity/user-security-actions';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import UserPasswordResetDrawer from '#/components/business/identity/UserPasswordResetDrawer.vue';
import { forceLogoutUser } from '#/modules/identity/user-security-actions';
import { userPageContract } from '#/modules/platform/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const resetOpen = ref(false);
const selectedUser = ref<UserSecurityTarget>();
const securityCapabilities = [
  {
    action: 'reset-password',
    key: 'identity.user:reset-password',
    resource: 'identity.user',
  },
  {
    action: 'force-logout',
    key: 'identity.user:force-logout',
    resource: 'identity.user',
  },
];
const contract = {
  ...userPageContract,
  capabilities: [
    ...(userPageContract.capabilities ?? []),
    ...securityCapabilities,
  ],
  table: {
    ...userPageContract.table,
    rowActions: [
      ...(userPageContract.table.rowActions ?? []),
      {
        authorization: securityCapabilities[0],
        deferred: true,
        key: 'reset-password',
        label: '重置密码',
        run: async (row: Record<string, unknown>) => {
          selectedUser.value = {
            displayName: String(row.display_name || row.username || row.id),
            id: String(row.id),
            username: String(row.username ?? ''),
          };
          resetOpen.value = true;
        },
        visible: (row: Record<string, unknown>) => row.status !== 'closed',
      },
      {
        authorization: securityCapabilities[1],
        confirm: '这会立即撤销该用户的全部登录会话，确定继续吗？',
        danger: true,
        key: 'force-logout',
        label: '强制下线',
        run: forceLogoutUser,
        successMessage: '用户全部会话已撤销',
        visible: (row: Record<string, unknown>) => row.status !== 'closed',
      },
    ],
  },
};
</script>

<template>
  <Page title="用户管理" description="维护全局唯一用户及其账号状态。">
    <FlatResourcePage :contract="contract">
      <template #toolbar>
        <UserPasswordResetDrawer
          v-model:open="resetOpen"
          :user="selectedUser"
        />
      </template>
    </FlatResourcePage>
  </Page>
</template>
