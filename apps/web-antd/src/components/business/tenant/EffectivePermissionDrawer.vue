<script setup lang="ts">
import type { EffectivePermission } from '#/modules/tenant/effective-permissions';

import { onScopeDispose, ref, watch } from 'vue';

import { Alert, Button, Drawer, Empty, Table, Tag } from 'ant-design-vue';

import { getEffectivePermissions } from '#/modules/tenant/effective-permissions';

const props = defineProps<{
  member?: { id: string; name: string };
  open: boolean;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const items = ref<EffectivePermission[]>([]);
const loading = ref(false);
const failure = ref('');
let controller: AbortController | undefined;
let generation = 0;

const columns = [
  { dataIndex: 'name', key: 'name', title: '权限名称', width: 180 },
  {
    dataIndex: 'permission_key',
    key: 'permission_key',
    title: '权限标识',
    width: 240,
  },
  { dataIndex: 'resource', key: 'resource', title: '资源', width: 180 },
  { dataIndex: 'action', key: 'action', title: '动作', width: 120 },
];

async function load() {
  if (!props.open || !props.member) return;
  controller?.abort();
  const currentController = new AbortController();
  controller = currentController;
  const current = ++generation;
  loading.value = true;
  failure.value = '';
  try {
    const result = await getEffectivePermissions(
      props.member.id,
      currentController.signal,
    );
    if (current === generation) items.value = result;
  } catch (error) {
    if (current === generation) {
      items.value = [];
      failure.value =
        error instanceof Error ? error.message : '有效权限加载失败';
    }
  } finally {
    if (current === generation) {
      loading.value = false;
      controller = undefined;
    }
  }
}

watch(
  [() => props.open, () => props.member?.id],
  ([open]) => {
    if (open) void load();
    else {
      generation++;
      controller?.abort();
      controller = undefined;
      items.value = [];
      failure.value = '';
    }
  },
  { immediate: true },
);

onScopeDispose(() => {
  generation++;
  controller?.abort();
});
</script>

<template>
  <Drawer
    :open="open"
    :title="member ? `有效权限 · ${member.name}` : '有效权限'"
    :width="880"
    @close="emit('update:open', false)"
  >
    <Alert
      v-if="failure"
      class="mb-4"
      :message="failure"
      show-icon
      type="error"
    >
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Table
      v-if="items.length > 0 || loading"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="small"
    >
      <template #bodyCell="{ column, text }">
        <Tag v-if="column.key === 'resource' || column.key === 'action'">
          {{ text }}
        </Tag>
      </template>
    </Table>
    <Empty v-else-if="!failure" description="该成员暂无有效权限" />
  </Drawer>
</template>
