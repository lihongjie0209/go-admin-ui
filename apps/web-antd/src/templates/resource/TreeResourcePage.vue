<script setup lang="ts">
import type { TreeResourcePageContract } from './resource-page-contract';

import type { NormalizedTreeRecord } from '#/components/foundation/tree-contract';

import { computed, ref } from 'vue';

import GoResourceEditor from '#/components/business/GoResourceEditor.vue';
import GoTreeResource from '#/components/business/GoTreeResource.vue';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';

import { resourcePageCapabilities } from './resource-page-contract';

const props = defineProps<{ contract: TreeResourcePageContract }>();

const tree = ref<InstanceType<typeof GoTreeResource>>();
const editorOpen = ref(false);
const editingNode = ref<NormalizedTreeRecord | null>(null);
const parent = ref<NormalizedTreeRecord | null>(null);
const editorMode = computed(() => (editingNode.value ? 'edit' : 'create'));
const initialValues = computed(() => ({
  ...props.contract.editorInitialValues,
  parent_id: parent.value?.id ?? null,
}));
const capabilities = computed(() =>
  resourcePageCapabilities(props.contract.authorizationResource, [
    ...(props.contract.capabilities ?? []),
    ...(props.contract.createAuthorizations ?? []),
    ...(props.contract.updateAuthorizations ?? []),
  ]),
);

function openCreate(parentNode: NormalizedTreeRecord | null) {
  editingNode.value = null;
  parent.value = parentNode;
  editorOpen.value = true;
}

function openEdit(node: NormalizedTreeRecord) {
  parent.value = null;
  editingNode.value = node;
  editorOpen.value = true;
}

async function submit(
  values: Record<string, unknown>,
  snapshot: null | Record<string, unknown>,
) {
  await (snapshot
    ? tree.value?.updateNode(
        values,
        snapshot as unknown as NormalizedTreeRecord,
      )
    : tree.value?.createNode(values));
}
</script>

<template>
  <GoCapabilityProvider :capabilities="capabilities">
    <GoTreeResource
      ref="tree"
      :authorization-resource="contract.authorizationResource"
      :can-delete-node="contract.canDeleteNode"
      :can-edit-node="contract.canEditNode"
      :create-authorizations="contract.createAuthorizations"
      :endpoints="contract.endpoints"
      :fixed-filters="contract.fixedFilters"
      :row-authorization="contract.rowAuthorization"
      :row-authorization-actions="contract.rowAuthorizationActions"
      :update-authorizations="contract.updateAuthorizations"
      @create="openCreate"
      @edit="openEdit"
    >
      <template #toolbar="slotProps">
        <slot name="toolbar" v-bind="slotProps"></slot>
      </template>
      <template #node="slotProps">
        <slot name="node" v-bind="slotProps">{{ slotProps.node.name }}</slot>
      </template>
    </GoTreeResource>
    <GoResourceEditor
      v-model:open="editorOpen"
      :authorization-resource="contract.authorizationResource"
      :fields="contract.editorFields"
      :initial-values="initialValues"
      :mode="editorMode"
      :record="editingNode"
      :submit="submit"
    />
  </GoCapabilityProvider>
</template>
