<script setup lang="ts">
import type { VersionedRecord } from '#/api/go';
import type {
  TreeResourceContract,
  TreeResourceEndpoints,
} from '#/api/go/tree-resource';
import type {
  NormalizedTreeRecord,
  TreeRecord,
} from '#/components/foundation/tree-contract';

import { computed, onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Empty,
  Input,
  message,
  Popconfirm,
  Space,
  Spin,
  Tree,
} from 'ant-design-vue';

import { createTreeResourceApi } from '#/api/go/tree-resource';
import {
  canMoveTreeNode,
  filterTreeWithAncestors,
  flattenTree,
  normalizeTree,
} from '#/components/foundation/tree-contract';
import { usePageCapability } from '#/composables/use-page-capabilities';
import { useRowCapabilities } from '#/composables/use-pbac';

const props = withDefaults(
  defineProps<{
    authorizationResource: string;
    canDeleteNode?: (node: NormalizedTreeRecord) => boolean;
    canEditNode?: (node: NormalizedTreeRecord) => boolean;
    endpoints: TreeResourceEndpoints;
    fixedFilters?: Record<string, unknown>;
    mapTreeRequest?: TreeResourceContract<
      TreeRecord & VersionedRecord
    >['toTreeRequest'];
    rowAuthorization?: boolean;
    rowAuthorizationActions?: string[];
  }>(),
  {
    fixedFilters: () => ({}),
    canDeleteNode: () => true,
    canEditNode: () => true,
    mapTreeRequest: undefined,
    rowAuthorization: false,
    rowAuthorizationActions: () => ['update', 'delete'],
  },
);

const emit = defineEmits<{
  create: [parent: NormalizedTreeRecord | null];
  edit: [node: NormalizedTreeRecord];
  select: [node: NormalizedTreeRecord | null];
}>();

const api = createTreeResourceApi<TreeRecord & VersionedRecord>({
  endpoints: props.endpoints,
  toTreeRequest: props.mapTreeRequest,
});
const nodes = ref<NormalizedTreeRecord[]>([]);
const keyword = ref('');
const selectedID = ref('');
const loading = ref(false);
const loadError = ref<unknown>();
let generation = 0;
let controller: AbortController | undefined;

const createCapability = usePageCapability({
  action: 'create',
  key: `${props.authorizationResource}:create`,
  resource: props.authorizationResource,
});
const listCapability = usePageCapability({
  action: 'list',
  key: `${props.authorizationResource}:list`,
  resource: props.authorizationResource,
});
const updateCapability = usePageCapability({
  action: 'update',
  key: `${props.authorizationResource}:update`,
  resource: props.authorizationResource,
});
const deleteCapability = usePageCapability({
  action: 'delete',
  key: `${props.authorizationResource}:delete`,
  resource: props.authorizationResource,
});
const rowCapabilities = useRowCapabilities(
  computed(() => props.authorizationResource),
  computed(() => props.rowAuthorizationActions),
  computed(() =>
    props.rowAuthorization && selectedID.value ? [selectedID.value] : [],
  ),
);

const selected = computed(
  () =>
    flattenTree(nodes.value).find((node) => node.id === selectedID.value) ??
    null,
);
const visibleNodes = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase('zh-CN');
  if (!search) return nodes.value;
  return filterTreeWithAncestors(nodes.value, (node) =>
    [node.name, node.code, node.navigation_key, node.permission_key].some(
      (value) =>
        String(value ?? '')
          .toLocaleLowerCase('zh-CN')
          .includes(search),
    ),
  );
});
const canUpdateSelected = computed(() => {
  const node = selected.value;
  return (
    node !== null &&
    props.canEditNode(node) &&
    updateCapability.allowed.value &&
    (!props.rowAuthorization ||
      rowCapabilities.allowed(selectedID.value, 'update'))
  );
});
const canDeleteSelected = computed(() => {
  const node = selected.value;
  return (
    node !== null &&
    props.canDeleteNode(node) &&
    node.children.length === 0 &&
    deleteCapability.allowed.value &&
    (!props.rowAuthorization ||
      rowCapabilities.allowed(selectedID.value, 'delete'))
  );
});

async function load() {
  if (!listCapability.allowed.value) return;
  const current = ++generation;
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  loadError.value = undefined;
  try {
    const result = await api.tree({
      filters: props.fixedFilters,
      keyword: '',
      signal: controller.signal,
    });
    if (current !== generation) return;
    nodes.value = normalizeTree(result);
    if (
      selectedID.value &&
      !flattenTree(nodes.value).some((node) => node.id === selectedID.value)
    )
      selectNode([]);
  } catch (error) {
    if (
      current === generation &&
      !(error instanceof DOMException && error.name === 'AbortError')
    ) {
      nodes.value = [];
      loadError.value = error;
    }
  } finally {
    if (current === generation) loading.value = false;
  }
}

function selectNode(keys: Array<number | string>) {
  selectedID.value = keys[0] === undefined ? '' : String(keys[0]);
  emit('select', selected.value);
}

async function createNode(values: Record<string, unknown>) {
  await api.create(values);
  await load();
}

async function updateNode(
  values: Record<string, unknown>,
  current: NormalizedTreeRecord,
) {
  if (
    'parent_id' in values &&
    !canMoveTreeNode(
      nodes.value,
      current.id,
      (values.parent_id as null | string) ?? null,
    )
  ) {
    throw new Error('不能将节点移动到自身、后代或不存在的父节点下');
  }
  await api.update(values, current as TreeRecord & VersionedRecord);
  await load();
}

async function deleteNode(current: NormalizedTreeRecord) {
  if (current.children.length > 0) throw new Error('只能删除叶子节点');
  await api.delete(current as TreeRecord & VersionedRecord);
  selectedID.value = '';
  await load();
}

async function removeSelected() {
  if (!selected.value || !canDeleteSelected.value) return;
  try {
    await deleteNode(selected.value);
    message.success('删除成功');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败');
  }
}

watch(
  () => listCapability.allowed.value,
  (allowed) => {
    if (allowed) {
      void load();
      return;
    }
    generation++;
    controller?.abort();
    nodes.value = [];
    selectedID.value = '';
    loading.value = false;
    loadError.value = undefined;
  },
  { immediate: true },
);
onScopeDispose(() => {
  generation++;
  controller?.abort();
});
defineExpose({ createNode, deleteNode, load, updateNode });
</script>

<template>
  <section
    class="flex min-h-0 flex-1 flex-col gap-3 rounded-md border bg-card p-4"
  >
    <Space wrap>
      <Input.Search
        v-model:value="keyword"
        allow-clear
        placeholder="搜索名称或编码"
      />
      <Button
        v-if="createCapability.allowed.value"
        type="primary"
        @click="emit('create', null)"
      >
        新增根节点
      </Button>
      <Button
        v-if="createCapability.allowed.value && selected"
        @click="emit('create', selected)"
      >
        新增子节点
      </Button>
      <Button
        v-if="canUpdateSelected && selected"
        @click="emit('edit', selected)"
      >
        编辑
      </Button>
      <Popconfirm
        v-if="selected"
        title="确认删除该叶子节点？"
        @confirm="removeSelected"
      >
        <Button danger :disabled="!canDeleteSelected">删除</Button>
      </Popconfirm>
      <slot
        name="toolbar"
        :reload="load"
        :row-allowed="rowCapabilities.allowed"
        :selected="selected"
      ></slot>
    </Space>
    <Alert v-if="loadError" message="树数据加载失败" show-icon type="error">
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Spin :spinning="loading">
      <Tree
        v-if="visibleNodes.length > 0"
        block-node
        default-expand-all
        :field-names="{ children: 'children', key: 'id', title: 'name' }"
        :selected-keys="selectedID ? [selectedID] : []"
        :tree-data="visibleNodes"
        @select="selectNode"
      >
        <template #title="node">
          <slot name="node" :node="node">{{ node.name }}</slot>
        </template>
      </Tree>
      <Empty v-else-if="!loading && !loadError" description="暂无树节点" />
    </Spin>
  </section>
</template>
