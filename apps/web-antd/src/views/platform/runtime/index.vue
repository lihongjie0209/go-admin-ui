<script setup lang="ts">
import { Page } from '@vben/common-ui';

import RuntimeStatusPanel from '#/components/business/platform/RuntimeStatusPanel.vue';
import GoAccess from '#/components/foundation/GoAccess.vue';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';

const capabilities = [
  {
    action: 'read',
    key: 'platform.runtime:read',
    resource: 'platform.runtime',
  },
];
</script>

<template>
  <Page
    title="运行状态"
    description="查看当前服务构建版本、进程存活状态与基础设施就绪情况。"
  >
    <GoCapabilityProvider :capabilities="capabilities">
      <GoAccess action="read" resource="platform.runtime">
        <RuntimeStatusPanel />
      </GoAccess>
    </GoCapabilityProvider>
  </Page>
</template>
