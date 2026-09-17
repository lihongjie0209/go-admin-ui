<script setup lang="ts">
import type { PBACResourceDefinition, PBACResourceScope } from '#/api/go';

import { computed, onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Empty,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { filterPBACResources, listPBACResources } from '#/api/go';
import { usePageCapability } from '#/composables/use-page-capabilities';

const capability = usePageCapability({
  action: 'list',
  key: 'pbac.resource-action:list',
  resource: 'pbac.resource-action',
});
const definitions = ref<PBACResourceDefinition[]>([]);
const scope = ref<'' | PBACResourceScope>('');
const keyword = ref('');
const loading = ref(false);
const failure = ref('');
let controller: AbortController | undefined;
let generation = 0;

const rows = computed(() =>
  filterPBACResources(definitions.value, keyword.value),
);
const actionCount = computed(() =>
  definitions.value.reduce((total, item) => total + item.actions.length, 0),
);
const columns = [
  { dataIndex: 'key', key: 'key', title: 'Resource', width: 230 },
  { dataIndex: 'name', key: 'name', title: '资源名称', width: 160 },
  { dataIndex: 'scope', key: 'scope', title: '授权范围', width: 110 },
  { dataIndex: 'description', key: 'description', title: '说明', width: 240 },
  { dataIndex: 'actions', key: 'actions', title: 'Actions', width: 360 },
];
const scopeOptions = [
  { label: '全部范围', value: '' },
  { label: '平台', value: 'platform' },
  { label: '租户', value: 'tenant' },
  { label: '当前主体', value: 'principal' },
];

function scopeName(value: PBACResourceScope) {
  return { platform: '平台', principal: '主体', tenant: '租户' }[value];
}

async function load() {
  if (!capability.allowed.value) return;
  controller?.abort();
  const currentController = new AbortController();
  controller = currentController;
  const current = ++generation;
  loading.value = true;
  failure.value = '';
  try {
    const result = await listPBACResources(
      scope.value,
      currentController.signal,
    );
    if (current !== generation) return;
    definitions.value = result;
  } catch (error) {
    if (current === generation)
      failure.value =
        error instanceof Error ? error.message : '资源注册表加载失败';
  } finally {
    if (current === generation) {
      loading.value = false;
      controller = undefined;
    }
  }
}

watch(
  [() => capability.allowed.value, scope],
  ([allowed]) => {
    if (allowed) void load();
    else {
      generation++;
      controller?.abort();
      controller = undefined;
      definitions.value = [];
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
  <div class="flex min-h-0 flex-1 flex-col gap-4">
    <div
      class="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4"
    >
      <div>
        <div class="text-base font-medium">Resource / Action 注册表</div>
        <div class="mt-1 text-sm text-muted-foreground">
          {{ definitions.length }} 个资源，{{ actionCount }}
          个动作。策略只能引用注册表中的规范标识。
        </div>
      </div>
      <Space wrap>
        <Input.Search
          v-model:value="keyword"
          allow-clear
          placeholder="搜索资源或动作"
          style="width: 240px"
        />
        <Select
          v-model:value="scope"
          :options="scopeOptions"
          style="width: 140px"
        />
      </Space>
    </div>

    <Alert
      v-if="capability.error.value"
      message="权限能力加载失败，页面已按拒绝处理"
      show-icon
      type="error"
    />
    <Alert v-else-if="failure" :message="failure" show-icon type="error">
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>

    <Table
      :columns="columns"
      :data-source="rows"
      :loading="loading || capability.loading.value"
      :pagination="false"
      row-key="key"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <code v-if="column.key === 'key'">{{ record.key }}</code>
        <Tag v-else-if="column.key === 'scope'">
          {{ scopeName(record.scope) }}
        </Tag>
        <div
          v-else-if="column.key === 'actions'"
          class="flex flex-wrap gap-1.5"
        >
          <Tag
            v-for="action in record.actions"
            :key="action.key"
            :title="action.description || action.name"
            color="blue"
          >
            {{ action.key }} · {{ action.name }}
          </Tag>
        </div>
      </template>
      <template #emptyText>
        <Empty
          :description="
            keyword ? '没有匹配的资源或动作' : '当前范围尚未注册资源'
          "
        />
      </template>
    </Table>
  </div>
</template>
