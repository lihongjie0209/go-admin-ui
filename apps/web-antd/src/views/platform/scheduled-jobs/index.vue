<script setup lang="ts">
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { scheduledJobPageContract } from '#/modules/platform/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const router = useRouter();
const contract = {
  ...scheduledJobPageContract,
  table: {
    ...scheduledJobPageContract.table,
    rowActions: [
      ...(scheduledJobPageContract.table.rowActions ?? []),
      {
        deferred: true,
        key: 'runs',
        label: '执行记录',
        run: async (row: Record<string, unknown>) => {
          await router.push({
            name: 'PlatformScheduledJobRuns',
            params: { scheduledJobId: String(row.id) },
            query: { name: String(row.name ?? row.code) },
          });
        },
      },
    ],
  },
};
</script>

<template>
  <Page
    title="定时任务"
    description="维护代码注册执行器的调度定义；任务运行由分布式锁和超时共同保护。"
  >
    <FlatResourcePage :contract="contract" />
  </Page>
</template>
