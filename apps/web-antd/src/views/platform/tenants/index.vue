<script setup lang="ts">
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import GoSelectionDrawer from '#/components/business/GoSelectionDrawer.vue';
import TenantAdministratorDrawer from '#/components/business/platform/TenantAdministratorDrawer.vue';
import TenantApplicationGrantDrawer from '#/components/business/platform/TenantApplicationGrantDrawer.vue';
import { tenantPageContract } from '#/modules/platform/resource-contracts';
import {
  loadTenantPermissionCeiling,
  saveTenantPermissionCeiling,
} from '#/modules/platform/tenant-authorization';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const grantsOpen = ref(false);
const permissionsOpen = ref(false);
const administratorsOpen = ref(false);
const page = ref<InstanceType<typeof FlatResourcePage>>();
const tenant = ref<{ id: string; name: string; version: number }>();
const authorizationCapabilities = [
  { action: 'grant', key: 'tenant:grant', resource: 'tenant' },
  {
    action: 'assign-administrator',
    key: 'tenant:assign-administrator',
    resource: 'tenant',
  },
];
const grantCapabilities = [
  {
    action: 'list',
    key: 'tenant.application-grant:list',
    resource: 'tenant.application-grant',
  },
  {
    action: 'grant',
    key: 'tenant.application-grant:grant',
    resource: 'tenant.application-grant',
  },
  {
    action: 'revoke',
    key: 'tenant.application-grant:revoke',
    resource: 'tenant.application-grant',
  },
  {
    action: 'list',
    key: 'application:list',
    resource: 'application',
  },
];
const contract = {
  ...tenantPageContract,
  capabilities: [
    ...(tenantPageContract.capabilities ?? []),
    ...grantCapabilities,
    ...authorizationCapabilities,
  ],
  table: {
    ...tenantPageContract.table,
    rowActions: [
      ...(tenantPageContract.table.rowActions ?? []),
      {
        authorization: authorizationCapabilities[0],
        deferred: true,
        key: 'permission-ceiling',
        label: '权限上限',
        run: async (row: Record<string, unknown>) => {
          tenant.value = {
            id: String(row.id),
            name: String(row.name),
            version: Number(row.version),
          };
          permissionsOpen.value = true;
        },
      },
      {
        authorization: authorizationCapabilities[1],
        deferred: true,
        key: 'tenant-administrators',
        label: '租户管理员',
        run: async (row: Record<string, unknown>) => {
          tenant.value = {
            id: String(row.id),
            name: String(row.name),
            version: Number(row.version),
          };
          administratorsOpen.value = true;
        },
      },
      {
        authorization: grantCapabilities[0],
        deferred: true,
        key: 'application-grants',
        label: '应用授权',
        run: async (row: Record<string, unknown>) => {
          tenant.value = {
            id: String(row.id),
            name: String(row.name),
            version: Number(row.version),
          };
          grantsOpen.value = true;
        },
      },
    ],
  },
};

function loadPermissionCeiling(signal?: AbortSignal) {
  if (!tenant.value) return Promise.resolve({ items: [], selected: [] });
  return loadTenantPermissionCeiling(tenant.value.id, signal);
}

async function savePermissionCeiling(permissionIDs: string[]) {
  if (!tenant.value) return;
  await saveTenantPermissionCeiling(tenant.value, permissionIDs);
}

function permissionCeilingSaved() {
  void page.value?.reload();
}
</script>

<template>
  <Page title="租户管理" description="创建租户、指定负责人并维护租户状态。">
    <FlatResourcePage ref="page" :contract="contract">
      <template #toolbar>
        <GoSelectionDrawer
          v-model:open="permissionsOpen"
          :load="loadPermissionCeiling"
          :save="savePermissionCeiling"
          :telemetry="{
            eventName: 'tenant:grant',
            resourceId: tenant?.id ?? '',
          }"
          :title="tenant ? `权限上限 · ${tenant.name}` : '权限上限'"
          @saved="permissionCeilingSaved"
        />
        <TenantAdministratorDrawer
          v-model:open="administratorsOpen"
          :tenant="tenant"
        />
        <TenantApplicationGrantDrawer
          v-model:open="grantsOpen"
          :tenant="tenant"
        />
      </template>
    </FlatResourcePage>
  </Page>
</template>
