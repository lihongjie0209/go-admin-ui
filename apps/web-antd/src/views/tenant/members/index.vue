<script setup lang="ts">
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import GoSelectionDrawer from '#/components/business/GoSelectionDrawer.vue';
import EffectivePermissionDrawer from '#/components/business/tenant/EffectivePermissionDrawer.vue';
import {
  loadMemberRoleAssignment,
  saveMemberRoleAssignment,
} from '#/modules/tenant/member-role-assignment';
import { tenantMemberPageContract } from '#/modules/tenant/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const page = ref<InstanceType<typeof FlatResourcePage>>();
const assignmentOpen = ref(false);
const effectivePermissionsOpen = ref(false);
const member = ref<Record<string, unknown>>();
const effectivePermissionCapability = {
  action: 'read',
  key: 'tenant.authorization:read',
  resource: 'tenant.authorization',
};
const contract = {
  ...tenantMemberPageContract,
  capabilities: [
    ...(tenantMemberPageContract.capabilities ?? []),
    {
      action: 'assign-role',
      key: 'tenant.member:assign-role',
      resource: 'tenant.member',
    },
    effectivePermissionCapability,
  ],
  table: {
    ...tenantMemberPageContract.table,
    rowActions: [
      {
        authorization: effectivePermissionCapability,
        deferred: true,
        key: 'effective-permissions',
        label: '有效权限',
        run: async (row: Record<string, unknown>) => {
          member.value = row;
          effectivePermissionsOpen.value = true;
        },
      },
      {
        authorization: {
          action: 'assign-role',
          key: 'tenant.member:assign-role',
          resource: 'tenant.member',
        },
        deferred: true,
        key: 'assign-role',
        label: '分配角色',
        rowAuthorization: true,
        run: async (row: Record<string, unknown>) => {
          member.value = row;
          assignmentOpen.value = true;
        },
      },
    ],
  },
};

async function loadRoleAssignment(signal?: AbortSignal) {
  if (!member.value) return { items: [], selected: [] };
  return loadMemberRoleAssignment(String(member.value.id), signal);
}

async function saveRoleAssignment(roleIDs: string[]) {
  if (!member.value) return;
  await saveMemberRoleAssignment(
    {
      id: String(member.value.id),
      version: Number(member.value.version),
    },
    roleIDs,
  );
}

function assignmentSaved() {
  void page.value?.reload();
}
</script>

<template>
  <Page title="租户成员" description="维护当前租户的用户成员和成员状态。">
    <FlatResourcePage ref="page" :contract="contract" />
    <GoSelectionDrawer
      v-model:open="assignmentOpen"
      :load="loadRoleAssignment"
      :save="saveRoleAssignment"
      :telemetry="{
        eventName: 'tenant.member:assign-role',
        resourceId: String(member?.id ?? ''),
      }"
      title="分配成员角色"
      @saved="assignmentSaved"
    />
    <EffectivePermissionDrawer
      v-model:open="effectivePermissionsOpen"
      :member="
        member
          ? {
              id: String(member.id),
              name: String(member.display_name || member.username || member.id),
            }
          : undefined
      "
    />
  </Page>
</template>
