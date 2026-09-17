<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { operationLogPageContract } from '#/modules/audit/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';
</script>

<template>
  <Page
    title="操作日志"
    description="按操作人、资源和请求链路查询业务操作记录。"
  >
    <FlatResourcePage :contract="operationLogPageContract" />
  </Page>
</template>
