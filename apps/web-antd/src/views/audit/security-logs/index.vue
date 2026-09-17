<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { securityLogPageContract } from '#/modules/audit/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';
</script>

<template>
  <Page
    title="安全日志"
    description="审计登录、令牌、会话、凭据和权限变更等安全事件。"
  >
    <FlatResourcePage :contract="securityLogPageContract" />
  </Page>
</template>
