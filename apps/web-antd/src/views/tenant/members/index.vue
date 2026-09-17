<script setup lang="ts">
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { requestClient } from '#/api/request';
import GoSelectionDrawer from '#/components/business/GoSelectionDrawer.vue';
import EffectivePermissionDrawer from '#/components/business/tenant/EffectivePermissionDrawer.vue';
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
        run: async (row: Record<string, unknown>) => {
          member.value = row;
          assignmentOpen.value = true;
        },
      },
    ],
  },
};

async function loadRoleAssignment() {
  if (!member.value) return { items: [], selected: [] };
  const [rolePage, assigned] = await Promise.all([
    requestClient.post<{
      items: Array<{ code: string; id: string; name: string }>;
    }>('/tenant-roles/page', {
      keyword: '',
      page: 1,
      page_size: 200,
      statuses: ['active'],
    }),
    requestClient.post<Array<{ id: string }>>('/tenant-members/roles/get', {
      membership_id: String(member.value.id),
    }),
  ]);
  return {
    items: rolePage.items.map((role) => ({
      description: role.code,
      id: role.id,
      name: role.name,
    })),
    selected: assigned.map((role) => role.id),
  };
}

async function saveRoleAssignment(roleIDs: string[]) {
  if (!member.value) return;
  await requestClient.post('/tenant-members/roles/set', {
    membership_id: String(member.value.id),
    role_ids: roleIDs,
    version: Number(member.value.version),
  });
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
