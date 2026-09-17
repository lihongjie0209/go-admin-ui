<script setup lang="ts">
import type {
  GoResourceQuery,
  GoResourceTableProps,
} from './go-resource-types';

import type { QueryField } from '#/components/foundation/query-contract';

import { ref } from 'vue';

import GoQueryForm from '#/components/foundation/GoQueryForm.vue';
import { normalizeQuery } from '#/components/foundation/query-contract';

import GoResourceTable from './GoResourceTable.vue';

const props = withDefaults(
  defineProps<{
    initialQueryValues?: Record<string, unknown>;
    queryFields: QueryField[];
    table: GoResourceTableProps;
  }>(),
  {
    initialQueryValues: () => ({}),
  },
);

const query = ref<GoResourceQuery>(
  normalizeQuery(props.queryFields, props.initialQueryValues),
);
const tableRef = ref<InstanceType<typeof GoResourceTable>>();

function applyQuery(value: GoResourceQuery) {
  query.value = value;
}

defineExpose({
  createRecord: (values: Record<string, unknown>) =>
    tableRef.value?.createRecord(values),
  reload: (options?: { resetPage?: boolean }) =>
    tableRef.value?.reload(options),
  updateRecord: (
    values: Record<string, unknown>,
    row: Record<string, unknown>,
  ) => tableRef.value?.updateRecord(values, row),
});
</script>

<template>
  <section class="flex min-h-0 flex-1 flex-col gap-4">
    <div v-if="queryFields.length > 0" class="rounded-md border bg-card p-4">
      <GoQueryForm
        :fields="queryFields"
        :initial-values="initialQueryValues"
        @submit="applyQuery"
      />
    </div>
    <GoResourceTable ref="tableRef" v-bind="table" :query="query" />
  </section>
</template>
