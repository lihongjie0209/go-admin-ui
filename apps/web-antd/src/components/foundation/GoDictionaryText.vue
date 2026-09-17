<script setup lang="ts">
import type { DynamicDictionaryItem } from '#/api/go/dictionary';

import { computed, onScopeDispose, ref, watch } from 'vue';

import { Skeleton, Space, Tag } from 'ant-design-vue';

import { loadDictionaryItems } from '#/api/go/dictionary-cache';

const props = withDefaults(
  defineProps<{
    dictionaryKey: string;
    empty?: string;
    params?: Record<string, unknown>;
    value?: null | string | string[];
  }>(),
  {
    empty: '—',
    params: () => ({}),
    value: null,
  },
);

const items = ref<DynamicDictionaryItem[]>([]);
const loading = ref(false);
let generation = 0;

const values = computed(() => {
  if (Array.isArray(props.value)) return props.value;
  return props.value ? [props.value] : [];
});
const selected = computed(() => {
  const byValue = new Map(items.value.map((item) => [item.value, item]));
  return values.value.map(
    (value) => byValue.get(value) ?? { label: value, value },
  );
});

async function load() {
  const current = ++generation;
  loading.value = true;
  try {
    const result = await loadDictionaryItems(props.dictionaryKey, props.params);
    if (current === generation) items.value = result;
  } catch {
    if (current === generation) items.value = [];
  } finally {
    if (current === generation) loading.value = false;
  }
}

watch([() => props.dictionaryKey, () => props.params], load, {
  deep: true,
  immediate: true,
});
onScopeDispose(() => {
  generation++;
});
</script>

<template>
  <Skeleton v-if="loading" active :paragraph="false" />
  <span v-else-if="selected.length === 0" class="text-muted-foreground">{{
    empty
  }}</span>
  <Space v-else wrap :size="4">
    <Tag
      v-for="item in selected"
      :key="item.value"
      :color="'color' in item ? item.color || undefined : undefined"
    >
      {{ item.label }}
    </Tag>
  </Space>
</template>
