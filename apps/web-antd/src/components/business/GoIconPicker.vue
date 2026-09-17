<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { addCollection } from '@vben/icons';

import {
  Button,
  Input,
  message,
  Modal,
  Pagination,
  Spin,
} from 'ant-design-vue';

import GoIcon from './GoIcon.vue';
import { loadOfflineIconCollections } from './offline-icon-collections';

const props = withDefaults(
  defineProps<{ disabled?: boolean; placeholder?: string }>(),
  { disabled: false, placeholder: '请选择图标' },
);

const modelValue = defineModel<string>({ default: '' });
const open = ref(false);
const keyword = ref('');
const page = ref(1);
const pageSize = 80;
const loading = ref(false);
const loaded = ref(false);
const offlineIcons = ref<string[]>([]);
let active = true;
onBeforeUnmount(() => {
  active = false;
});
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) open.value = false;
  },
);

const filteredIcons = computed(() => {
  const term = keyword.value.trim().toLowerCase();
  return term
    ? offlineIcons.value.filter((icon) => icon.toLowerCase().includes(term))
    : offlineIcons.value;
});
const pageIcons = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredIcons.value.slice(start, start + pageSize);
});

watch(keyword, () => {
  page.value = 1;
});

function selectIcon(icon: string) {
  if (
    props.disabled ||
    !open.value ||
    loading.value ||
    !offlineIcons.value.includes(icon)
  )
    return;
  modelValue.value = icon;
  open.value = false;
}

async function openPicker() {
  if (props.disabled) return;
  open.value = true;
  if (loaded.value || loading.value) return;
  loading.value = true;
  try {
    const collections = await loadOfflineIconCollections();
    if (!active) return;
    collections.forEach((collection) => addCollection(collection));
    offlineIcons.value = collections.flatMap((collection) =>
      Object.keys(collection.icons).map(
        (name) => `${collection.prefix}:${name}`,
      ),
    );
    loaded.value = true;
  } catch {
    if (active) message.error('本地图标加载失败，请重新打开选择框重试');
  } finally {
    if (active) loading.value = false;
  }
}
</script>

<template>
  <div class="icon-trigger">
    <div class="icon-current">
      <GoIcon :icon="modelValue" :size="20" />
      <span>{{ modelValue || props.placeholder }}</span>
    </div>
    <Button
      v-if="modelValue"
      :disabled="disabled"
      @click="!disabled && (modelValue = '')"
    >
      清空
    </Button>
    <Button :disabled="disabled" :loading="loading" @click="openPicker">
      选择图标
    </Button>
  </div>

  <Modal v-model:open="open" :footer="null" title="选择图标" width="920px">
    <Input
      v-model:value="keyword"
      allow-clear
      autofocus
      placeholder="搜索图标名称，例如 user、menu、setting"
    />
    <div class="icon-summary">共 {{ filteredIcons.length }} 个本地图标</div>
    <Spin :spinning="loading">
      <div class="icon-grid">
        <button
          v-for="icon in pageIcons"
          :key="icon"
          class="icon-option"
          :class="{ selected: modelValue === icon }"
          :title="icon"
          type="button"
          @click="selectIcon(icon)"
        >
          <GoIcon :icon="icon" :size="24" />
          <span>{{ icon.split(':')[1] }}</span>
        </button>
      </div>
    </Spin>
    <Pagination
      v-model:current="page"
      class="icon-pagination"
      :page-size="pageSize"
      :show-size-changer="false"
      :total="filteredIcons.length"
    />
  </Modal>
</template>

<style scoped>
.icon-trigger {
  display: flex;
  gap: 8px;
  width: 100%;
}

.icon-current {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 0 11px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.icon-current span {
  overflow: hidden;
  text-overflow: ellipsis;
  color: #666;
  white-space: nowrap;
}

.icon-summary {
  margin: 10px 0 8px;
  font-size: 12px;
  color: #8c8c8c;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 6px;
  align-content: start;
  height: 488px;
  overflow: auto;
}

.icon-option {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 54px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 4px;
}

.icon-option:hover,
.icon-option.selected {
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 6%);
  border-color: hsl(var(--primary));
}

.icon-option span {
  width: 100%;
  padding: 0 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  text-align: center;
  white-space: nowrap;
}

.icon-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
