<script setup lang="ts">
import { Page } from '@vben/common-ui';

import PermissionActionBinding from '#/components/business/PermissionActionBinding.vue';
import { permissionTreeContract } from '#/modules/platform/resource-contracts';
import TreeResourcePage from '#/templates/resource/TreeResourcePage.vue';
</script>

<template>
  <Page
    title="权限定义"
    description="维护稳定的权限标识，并将每个权限关联到一个或多个同范围的资源动作。"
  >
    <TreeResourcePage :contract="permissionTreeContract">
      <template #toolbar="{ selected, reload }">
        <PermissionActionBinding :selected="selected" @saved="reload" />
      </template>
    </TreeResourcePage>
  </Page>
</template>
