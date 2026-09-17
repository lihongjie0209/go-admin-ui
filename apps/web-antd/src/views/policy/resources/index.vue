<script setup lang="ts">
import { Page } from '@vben/common-ui';

import PolicyResourceRegistryPage from '#/templates/policy/PolicyResourceRegistryPage.vue';
</script>

<template>
  <Page
    title="资源与动作"
    description="查看业务模块已注册的规范 Resource / Action，作为操作策略和菜单授权的唯一标识。"
  >
    <PolicyResourceRegistryPage />
  </Page>
</template>
