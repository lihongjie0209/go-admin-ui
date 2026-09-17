<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { permissionTreeContract } from '#/modules/platform/resource-contracts';
import TreeResourcePage from '#/templates/resource/TreeResourcePage.vue';
</script>

<template>
  <Page
    title="权限定义"
    description="维护稳定的权限标识以及 PBAC 资源和动作映射。"
  >
    <TreeResourcePage :contract="permissionTreeContract" />
  </Page>
</template>
