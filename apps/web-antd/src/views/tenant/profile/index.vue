<script setup lang="ts">
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import TenantAdministratorDrawer from '#/components/business/platform/TenantAdministratorDrawer.vue';
import { tenantProfilePageContract } from '#/modules/tenant/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const administratorsOpen = ref(false);
const tenant = ref<{ id: string; name: string }>();
const administratorCapability = {
  action: 'assign-administrator',
  key: 'tenant.authorization:assign-administrator',
  resource: 'tenant.authorization',
};
const contract = {
  ...tenantProfilePageContract,
  capabilities: [
    ...(tenantProfilePageContract.capabilities ?? []),
    administratorCapability,
  ],
  table: {
    ...tenantProfilePageContract.table,
    rowActions: [
      ...(tenantProfilePageContract.table.rowActions ?? []),
      {
        authorization: administratorCapability,
        deferred: true,
        key: 'tenant-administrators',
        label: '租户管理员',
        run: async (row: Record<string, unknown>) => {
          tenant.value = { id: String(row.id), name: String(row.name) };
          administratorsOpen.value = true;
        },
      },
    ],
  },
};
</script>

<template>
  <Page
    title="当前租户"
    description="维护当前租户的名称、说明和运行状态。租户编码创建后不可修改。"
  >
    <FlatResourcePage :contract="contract">
      <template #toolbar>
        <TenantAdministratorDrawer
          v-model:open="administratorsOpen"
          scope="tenant"
          :tenant="tenant"
        />
      </template>
    </FlatResourcePage>
  </Page>
</template>
