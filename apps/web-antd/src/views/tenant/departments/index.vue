<script setup lang="ts">
import type { NormalizedTreeRecord } from '#/components/foundation/tree-contract';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button } from 'ant-design-vue';

import DepartmentMemberAssignmentDrawer from '#/components/business/tenant/DepartmentMemberAssignmentDrawer.vue';
import GoAccess from '#/components/foundation/GoAccess.vue';
import { tenantDepartmentTreeContract } from '#/modules/tenant/resource-contracts';
import TreeResourcePage from '#/templates/resource/TreeResourcePage.vue';

const assignmentOpen = ref(false);
const selectedDepartment = ref<NormalizedTreeRecord | null>(null);

function openAssignment(department: NormalizedTreeRecord) {
  selectedDepartment.value = department;
  assignmentOpen.value = true;
}
</script>

<template>
  <Page
    title="组织部门"
    description="维护当前租户的部门层级；删除仅允许空叶子部门。"
  >
    <TreeResourcePage :contract="tenantDepartmentTreeContract">
      <template #toolbar="{ rowAllowed, selected }">
        <GoAccess action="list" resource="tenant.member">
          <Button
            v-if="selected"
            :disabled="!rowAllowed(selected.id, 'assign-member')"
            @click="openAssignment(selected)"
          >
            分配成员
          </Button>
        </GoAccess>
      </template>
    </TreeResourcePage>
    <DepartmentMemberAssignmentDrawer
      v-model:open="assignmentOpen"
      :department="selectedDepartment"
    />
  </Page>
</template>
