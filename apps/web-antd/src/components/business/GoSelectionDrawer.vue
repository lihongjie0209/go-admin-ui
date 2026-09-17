<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Drawer,
  Empty,
  message,
  Spin,
  Transfer,
} from 'ant-design-vue';

import { useFrontendAction } from '#/composables/use-frontend-action';

export interface SelectionItem {
  description?: string;
  disabled?: boolean;
  id: string;
  name: string;
}

export interface SelectionSnapshot {
  items: SelectionItem[];
  selected: string[];
}

export interface SelectionTelemetry {
  eventName: string;
  resourceId: string;
}

const props = withDefaults(
  defineProps<{
    load: (signal?: AbortSignal) => Promise<SelectionSnapshot>;
    open: boolean;
    save: (selected: string[]) => Promise<void>;
    telemetry: SelectionTelemetry;
    title: string;
  }>(),
  {},
);
const emit = defineEmits<{
  saved: [];
  'update:open': [value: boolean];
}>();

const runFrontendAction = useFrontendAction();
const items = ref<SelectionItem[]>([]);
const selected = ref<string[]>([]);
const loading = ref(false);
const saving = ref(false);
const loadError = ref<unknown>();
let generation = 0;
let controller: AbortController | undefined;

async function reloadOptions() {
  controller?.abort();
  const currentController = new AbortController();
  controller = currentController;
  const current = ++generation;
  loading.value = true;
  loadError.value = undefined;
  try {
    const snapshot = await props.load(currentController.signal);
    if (current !== generation) return;
    items.value = snapshot.items;
    const available = new Set(snapshot.items.map((item) => item.id));
    selected.value = snapshot.selected.filter((id) => available.has(id));
  } catch (error) {
    if (current === generation) {
      items.value = [];
      selected.value = [];
      loadError.value = error;
    }
  } finally {
    if (current === generation) {
      loading.value = false;
      controller = undefined;
    }
  }
}

async function saveSelection() {
  if (saving.value) return;
  saving.value = true;
  try {
    await runFrontendAction(
      props.telemetry.eventName,
      props.telemetry.resourceId,
      () => props.save([...selected.value]),
    );
    message.success('分配已保存');
    emit('saved');
    emit('update:open', false);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存分配失败');
  } finally {
    saving.value = false;
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) void reloadOptions();
    else {
      generation++;
      controller?.abort();
      controller = undefined;
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
    :mask-closable="!saving"
    :open="open"
    :title="title"
    :width="720"
    @close="emit('update:open', false)"
  >
    <Alert v-if="loadError" message="可选项加载失败" show-icon type="error">
      <template #action>
        <Button size="small" @click="reloadOptions">重试</Button>
      </template>
    </Alert>
    <Spin v-else :spinning="loading">
      <Transfer
        v-if="items.length > 0"
        v-model:target-keys="selected"
        :data-source="
          items.map((item) => ({
            description: item.description,
            disabled: item.disabled,
            key: item.id,
            title: item.name,
          }))
        "
        :disabled="saving"
        :list-style="{ height: '480px', width: '300px' }"
        :render="(item: any) => item.title"
        :show-select-all="true"
        show-search
        :titles="['可选', '已选择']"
      />
      <Empty v-else-if="!loading" description="暂无可分配项" />
    </Spin>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :disabled="saving" @click="emit('update:open', false)">
          取消
        </Button>
        <Button
          type="primary"
          :disabled="Boolean(loadError) || loading"
          :loading="saving"
          @click="saveSelection"
        >
          保存分配
        </Button>
      </div>
    </template>
  </Drawer>
</template>
