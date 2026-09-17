<script setup lang="ts">
import { Page } from '@vben/common-ui';

import RuntimeStatusPanel from '#/components/business/platform/RuntimeStatusPanel.vue';
</script>

<template>
  <Page
    title="运行状态"
    description="查看当前服务构建版本、进程存活状态与基础设施就绪情况。"
  >
    <RuntimeStatusPanel />
  </Page>
</template>
