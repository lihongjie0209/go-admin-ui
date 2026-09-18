<script setup lang="ts">
import type { GoResourceTableProps } from '#/components/business/go-resource-types';
import type { QueryField } from '#/components/foundation/query-contract';
import type {
  PolicyLifecycleKind,
  PolicyRecord,
} from '#/modules/policy/lifecycle-api';

import { computed, ref } from 'vue';

import { message } from 'ant-design-vue';

import GoResourceWorkspace from '#/components/business/GoResourceWorkspace.vue';
import PolicyDocumentDrawer from '#/components/business/policy/PolicyDocumentDrawer.vue';
import PolicyVersionsDrawer from '#/components/business/policy/PolicyVersionsDrawer.vue';
import {
  createPolicy,
  currentTenantID,
  defaultPolicyDocument,
  policyAuthorizationResource,
  setPolicyStatus,
} from '#/modules/policy/lifecycle-api';

const props = defineProps<{ kind: PolicyLifecycleKind }>();
const resource = computed(() => policyAuthorizationResource(props.kind));
const workspace = ref<InstanceType<typeof GoResourceWorkspace>>();
const createOpen = ref(false);
const initialDocument = ref('');
const versionsOpen = ref(false);
const selectedPolicy = ref<PolicyRecord>();
const tenantContextReadCapability = {
  action: 'read',
  key: 'tenant.context:read',
  resource: 'tenant.context',
};

const queryFields: QueryField[] = [
  {
    key: 'keyword',
    label: '关键词',
    placeholder: '策略编码或名称',
    type: 'keyword',
  },
  {
    filterKey: 'ids',
    key: 'ids',
    label: '策略 ID',
    maxItems: 200,
    type: 'id-in',
  },
  {
    filterKey: 'codes',
    key: 'codes',
    label: '策略编码',
    maxItems: 200,
    type: 'id-in',
  },
  {
    key: 'statuses',
    label: '状态',
    multiple: true,
    options: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'disabled' },
    ],
    type: 'select',
  },
  { key: 'created_at', label: '创建时间', type: 'date-range' },
  { key: 'updated_at', label: '更新时间', type: 'date-range' },
];

const table = computed<GoResourceTableProps>(() => {
  const base = props.kind.domain === 'pbac' ? '/pbac' : '/data-permissions';
  const prefix = `${base}/${props.kind.scope}-policies`;
  return {
    allowCreate: true,
    allowDelete: false,
    allowEdit: false,
    authorizationResource: resource.value,
    columns: [
      { field: 'code', minWidth: 190, title: '策略编码' },
      { field: 'name', minWidth: 190, title: '策略名称' },
      { field: 'scope', minWidth: 100, title: '范围' },
      {
        field: 'published_version_number',
        minWidth: 120,
        title: '发布版本',
      },
      {
        field: 'status',
        minWidth: 100,
        presentation: 'status',
        title: '状态',
      },
      {
        field: 'updated_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '更新时间',
      },
      { field: 'version', minWidth: 90, title: '锁版本' },
      { field: 'action', fixed: 'right', title: '操作', width: 260 },
    ],
    createAction: openCreate,
    createAuthorizations:
      props.kind.scope === 'tenant' ? [tenantContextReadCapability] : [],
    endpoints: {
      create: `${prefix}/create`,
      delete: `${prefix}/status/set`,
      get: `${prefix}/get`,
      page: `${prefix}/page`,
      update: `${prefix}/status/set`,
    },
    rowActions: [
      {
        authorization: {
          action: 'read',
          key: `${resource.value}:read`,
          resource: resource.value,
        },
        deferred: true,
        key: 'versions',
        label: '版本管理',
        run: async (row) => {
          selectedPolicy.value = row as PolicyRecord;
          versionsOpen.value = true;
        },
      },
      {
        authorization: {
          action: 'set-status',
          key: `${resource.value}:set-status`,
          resource: resource.value,
        },
        confirm: (row) =>
          row.status === 'active'
            ? '停用后该策略将从运行时移除，确定继续吗？'
            : '确定重新启用该策略吗？',
        key: 'set-status',
        label: '切换状态',
        run: async (row) => {
          await setPolicyStatus(
            props.kind,
            row as PolicyRecord,
            row.status === 'active' ? 'disabled' : 'active',
          );
        },
        successMessage: '策略状态已更新',
      },
    ],
  };
});

async function openCreate() {
  try {
    const tenantID =
      props.kind.scope === 'tenant' ? await currentTenantID() : '';
    initialDocument.value = defaultPolicyDocument(props.kind, tenantID);
    createOpen.value = true;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '无法读取当前租户');
  }
}

async function savePolicy(document: string) {
  return await createPolicy(props.kind, document);
}

function reload(resetPage = false) {
  void workspace.value?.reload({ resetPage });
}
</script>

<template>
  <GoResourceWorkspace
    ref="workspace"
    :query-fields="queryFields"
    :table="table"
  />
  <PolicyDocumentDrawer
    v-model:open="createOpen"
    :initial-document="initialDocument"
    :save="savePolicy"
    title="创建策略"
    @saved="reload(true)"
  />
  <PolicyVersionsDrawer
    v-model:open="versionsOpen"
    :kind="kind"
    :policy="selectedPolicy"
    @changed="reload()"
  />
</template>
