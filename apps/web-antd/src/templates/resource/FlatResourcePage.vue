<script setup lang="ts">
import type { FlatResourcePageContract } from './resource-page-contract';

import { computed, ref } from 'vue';

import GoResourceDetail from '#/components/business/GoResourceDetail.vue';
import GoResourceEditor from '#/components/business/GoResourceEditor.vue';
import GoResourceWorkspace from '#/components/business/GoResourceWorkspace.vue';
import GoAccess from '#/components/foundation/GoAccess.vue';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';

import { resourcePageCapabilities } from './resource-page-contract';

const props = defineProps<{ contract: FlatResourcePageContract }>();

const workspace = ref<InstanceType<typeof GoResourceWorkspace>>();
const editorOpen = ref(false);
const detailOpen = ref(false);
const detailRecordID = ref('');
const editingRecord = ref<null | Record<string, unknown>>(null);
const editorMode = computed(() => (editingRecord.value ? 'edit' : 'create'));
const hasEditor = computed(
  () =>
    props.contract.table.allowCreate !== false ||
    props.contract.table.allowEdit !== false,
);
const capabilities = computed(() =>
  resourcePageCapabilities(
    props.contract.authorizationResource,
    [
      ...(props.contract.table.allowCreate === false
        ? []
        : [
            {
              action: 'create',
              key: `${props.contract.authorizationResource}:create`,
              resource: props.contract.authorizationResource,
            },
          ]),
      ...(props.contract.table.allowEdit === false
        ? []
        : [
            {
              action: 'update',
              key: `${props.contract.authorizationResource}:update`,
              resource: props.contract.authorizationResource,
            },
          ]),
      ...(props.contract.table.allowDelete === false
        ? []
        : [
            {
              action: 'delete',
              key: `${props.contract.authorizationResource}:delete`,
              resource: props.contract.authorizationResource,
            },
          ]),
      ...(props.contract.capabilities ?? []),
      ...(props.contract.table.createAuthorizations ?? []),
      ...(props.contract.table.updateAuthorizations ?? []),
    ],
    false,
  ),
);
const table = computed(() => ({
  ...props.contract.table,
  allowCreate: props.contract.table.allowCreate ?? true,
  authorizationResource: props.contract.authorizationResource,
  createAction: openCreate,
  editAction: openEdit,
  rowActions: [
    ...(props.contract.allowDetail === false
      ? []
      : [
          {
            deferred: true,
            key: 'detail',
            label: '查看',
            run: openDetail,
          },
        ]),
    ...(props.contract.table.rowActions ?? []),
  ],
}));

function openCreate() {
  editingRecord.value = null;
  editorOpen.value = true;
}

function openEdit(row: Record<string, unknown>) {
  editingRecord.value = row;
  editorOpen.value = true;
}

async function openDetail(row: Record<string, unknown>) {
  detailRecordID.value = String(row.id ?? '');
  detailOpen.value = Boolean(detailRecordID.value);
}

async function submit(
  values: Record<string, unknown>,
  snapshot: null | Record<string, unknown>,
) {
  return snapshot
    ? await workspace.value?.updateRecord(values, snapshot)
    : await workspace.value?.createRecord(values);
}

async function reloadAfterSave(result: unknown) {
  await props.contract.onSaved?.(result, editorMode.value);
  void workspace.value?.reload({ resetPage: editorMode.value === 'create' });
}

defineExpose({
  reload: (options?: { resetPage?: boolean }) =>
    workspace.value?.reload(options),
});
</script>

<template>
  <GoCapabilityProvider :capabilities="capabilities">
    <GoAccess
      action="list"
      denied="message"
      denied-message="当前账号无权查看此资源列表"
      :resource="contract.authorizationResource"
    >
      <slot name="toolbar"></slot>
      <GoResourceWorkspace
        ref="workspace"
        :initial-query-values="contract.initialQueryValues"
        :query-fields="contract.queryFields"
        :table="table"
      />
      <GoResourceEditor
        v-if="hasEditor"
        v-model:open="editorOpen"
        :authorization-resource="contract.authorizationResource"
        :fields="contract.editorFields"
        :initial-values="contract.editorInitialValues"
        :mode="editorMode"
        :record="editingRecord"
        :submit="submit"
        @saved="reloadAfterSave"
      />
      <GoResourceDetail
        v-model:open="detailOpen"
        :authorization-resource="contract.authorizationResource"
        :endpoints="contract.table.endpoints"
        :fields="contract.detailFields"
        :record-id="detailRecordID"
      />
    </GoAccess>
  </GoCapabilityProvider>
</template>
