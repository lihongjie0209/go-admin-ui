<script setup lang="ts">
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import GoSelectionDrawer from '#/components/business/GoSelectionDrawer.vue';
import { tenantRolePageContract } from '#/modules/tenant/resource-contracts';
import {
  loadRolePermissionAssignment,
  saveRolePermissionAssignment,
} from '#/modules/tenant/role-permission-assignment';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const page = ref<InstanceType<typeof FlatResourcePage>>();
const assignmentOpen = ref(false);
const role = ref<Record<string, unknown>>();
const grantCapability = {
  action: 'grant',
  key: 'tenant.role:grant',
  resource: 'tenant.role',
};
const contract = {
  ...tenantRolePageContract,
  capabilities: [
    ...(tenantRolePageContract.capabilities ?? []),
    grantCapability,
  ],
  table: {
    ...tenantRolePageContract.table,
    rowActions: [
      {
        authorization: grantCapability,
        deferred: true,
        key: 'grant',
        label: '分配权限',
        rowAuthorization: true,
        run: async (row: Record<string, unknown>) => {
          role.value = row;
          assignmentOpen.value = true;
        },
      },
    ],
  },
};

function loadAssignment() {
  if (!role.value) return Promise.resolve({ items: [], selected: [] });
  return loadRolePermissionAssignment(String(role.value.id));
}

async function saveAssignment(permissionIDs: string[]) {
  if (!role.value) return;
  await saveRolePermissionAssignment(
    {
      id: String(role.value.id),
      version: Number(role.value.version),
    },
    permissionIDs,
  );
}

function assignmentSaved() {
  void page.value?.reload();
}
</script>

<template>
  <Page
    title="租户角色"
    description="角色只能在操作者已有权限范围内进行二次分配。"
  >
    <FlatResourcePage ref="page" :contract="contract" />
    <GoSelectionDrawer
      v-model:open="assignmentOpen"
      :load="loadAssignment"
      :save="saveAssignment"
      :telemetry="{
        eventName: 'tenant.role:grant',
        resourceId: String(role?.id ?? ''),
      }"
      title="分配角色权限"
      @saved="assignmentSaved"
    />
  </Page>
</template>
