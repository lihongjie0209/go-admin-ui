<script setup lang="ts">
import type { GoResourceTableProps } from './go-resource-types';

import type { VersionedRecord } from '#/api/go';

import { computed, inject, onScopeDispose, ref, watch } from 'vue';
import { routeLocationKey } from 'vue-router';

import { createResourceApi, trackFrontendAction } from '#/api/go';
import { usePageCapability } from '#/composables/use-page-capabilities';
import { useRowCapabilities } from '#/composables/use-pbac';

import GoDataGrid from './GoDataGrid.vue';

const props = withDefaults(defineProps<GoResourceTableProps>(), {
  allowCreate: true,
  allowDelete: true,
  allowEdit: true,
  defaultSort: () => [{ field: 'created_at', direction: 'desc' }],
  fixedFilters: () => ({}),
  pageSize: 20,
  rowActions: () => [],
  rowAuthorization: false,
  batchActions: () => [],
});

const table = ref<InstanceType<typeof GoDataGrid>>();
const route = inject(routeLocationKey, null);
const rowIds = ref<string[]>([]);
let pageGeneration = 0;
let pageController: AbortController | undefined;
const createCapability = usePageCapability({
  key: `${props.authorizationResource}:create`,
  resource: props.authorizationResource,
  action: 'create',
});
const listCapability = usePageCapability({
  key: `${props.authorizationResource}:list`,
  resource: props.authorizationResource,
  action: 'list',
});
const updateCapability = usePageCapability({
  key: `${props.authorizationResource}:update`,
  resource: props.authorizationResource,
  action: 'update',
});
const deleteCapability = usePageCapability({
  key: `${props.authorizationResource}:delete`,
  resource: props.authorizationResource,
  action: 'delete',
});
const rowCapabilities = useRowCapabilities(
  computed(() => props.authorizationResource),
  ['update', 'delete'],
  rowIds,
);
const authorizedRowActions = props.rowActions.map((action) => ({
  action,
  capability: action.authorization
    ? usePageCapability(action.authorization)
    : undefined,
}));
const visibleRowActions = computed(() =>
  authorizedRowActions.map(({ action, capability }) => ({
    ...action,
    visible: (row: Record<string, unknown>) =>
      (capability?.allowed.value ?? true) && (action.visible?.(row) ?? true),
  })),
);
const api = createResourceApi<Record<string, unknown> & VersionedRecord>({
  defaultSort: props.defaultSort,
  endpoints: props.endpoints,
  mapFilters: props.mapFilters,
  toCreate: props.toCreate,
  toUpdate: props.toUpdate,
});

async function dataProvider(request: {
  filters: Record<string, unknown>;
  page: number;
  pageSize: number;
}) {
  const current = ++pageGeneration;
  pageController?.abort();
  pageController = new AbortController();
  const result = await api.page({
    filters: {
      ...props.query?.filters,
      ...request.filters,
      ...props.fixedFilters,
    },
    keyword: props.query?.keyword ?? '',
    page: request.page,
    page_size: request.pageSize,
    signal: pageController.signal,
  });
  if (current !== pageGeneration)
    throw new DOMException('Stale page response', 'AbortError');
  rowIds.value = result.items.map((item) => String(item.id));
  return { items: result.items, total: result.total };
}

watch(
  () => props.query,
  () => {
    pageController?.abort();
    void table.value?.reload?.({ resetPage: true });
  },
  { deep: true },
);
onScopeDispose(() => {
  pageGeneration++;
  pageController?.abort();
});

async function remove(row: Record<string, unknown>) {
  await trackFrontendAction(actionEvent('delete', String(row.id ?? '')), () =>
    api.delete(row as Record<string, unknown> & VersionedRecord),
  );
}

async function createRecord(values: Record<string, unknown>) {
  return await trackFrontendAction(actionEvent('create'), () =>
    api.create(values),
  );
}

async function updateRecord(
  values: Record<string, unknown>,
  row: Record<string, unknown>,
) {
  return await trackFrontendAction(
    actionEvent('update', String(row.id ?? '')),
    () => api.update(values, row as Record<string, unknown> & VersionedRecord),
  );
}

function actionEvent(action: string, resourceID = '') {
  return {
    application_id: String(route?.meta.applicationId ?? ''),
    event_name: `${props.authorizationResource}:${action}`,
    page_route: route?.path ?? '',
    resource_id: resourceID,
  };
}

defineExpose({
  createRecord,
  reload: (options?: { resetPage?: boolean }) => table.value?.reload(options),
  updateRecord,
});
</script>

<template>
  <GoDataGrid
    ref="table"
    :allow-create="allowCreate && createCapability.allowed.value"
    :batch-actions="batchActions"
    :columns="columns"
    :create-action="createAction"
    :can-edit="
      (row) =>
        allowEdit &&
        updateCapability.allowed.value &&
        (!rowAuthorization || rowCapabilities.allowed(String(row.id), 'update'))
    "
    :can-remove="
      (row) =>
        allowDelete &&
        deleteCapability.allowed.value &&
        (!rowAuthorization || rowCapabilities.allowed(String(row.id), 'delete'))
    "
    :data-provider="dataProvider"
    :edit-action="editAction"
    :enabled="listCapability.allowed.value"
    :page-size="pageSize"
    :remove="allowDelete ? remove : undefined"
    :row-actions="visibleRowActions"
  />
</template>
