<script setup lang="ts">
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { applicationPageContract } from '#/modules/platform/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const router = useRouter();
const contract = {
  ...applicationPageContract,
  table: {
    ...applicationPageContract.table,
    rowActions: [
      {
        deferred: true,
        key: 'navigations',
        label: '配置导航',
        run: async (row: Record<string, unknown>) => {
          await router.push({
            name: 'PlatformApplicationNavigations',
            params: { applicationId: String(row.id) },
            query: { name: String(row.name) },
          });
        },
      },
    ],
  },
};
</script>

<template>
  <Page title="应用管理" description="维护可授权给租户的平台应用。">
    <FlatResourcePage :contract="contract" />
  </Page>
</template>
