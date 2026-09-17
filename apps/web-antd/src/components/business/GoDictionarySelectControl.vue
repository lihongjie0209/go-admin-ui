<script setup lang="ts">
import type { DynamicDictionaryItem } from '#/api/go/dictionary';

import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { message, Select, TreeSelect } from 'ant-design-vue';

import {
  queryAllDictionaryOptions,
  queryDictionary,
} from '#/api/go/dictionary';

const props = withDefaults(
  defineProps<{
    dictionaryKey: string;
    disabled?: boolean;
    expectedType?: 'enum' | 'tree';
    multiple?: boolean;
    params?: Record<string, unknown>;
    placeholder?: string;
  }>(),
  {
    disabled: false,
    expectedType: undefined,
    multiple: false,
    params: () => ({}),
    placeholder: '请选择',
  },
);
const emit = defineEmits<{
  select: [item: DynamicDictionaryItem | DynamicDictionaryItem[] | undefined];
}>();
const value = defineModel<string | string[]>('value');
const loading = ref(false);
const items = ref<DynamicDictionaryItem[]>([]);
const dictionaryType = ref<'enum' | 'tree'>('enum');
let timer: ReturnType<typeof setTimeout> | undefined;
let initializationVersion = 0;
let requestVersion = 0;

function valuesOf(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input;
  return input ? [input] : [];
}
onBeforeUnmount(() => {
  clearTimeout(timer);
  requestVersion++;
  initializationVersion++;
});

function merge(next: DynamicDictionaryItem[], replace = false) {
  const selected = new Set(valuesOf(value.value));
  const base = replace
    ? items.value.filter((item) => selected.has(item.value))
    : items.value;
  const map = new Map(base.map((item) => [item.id, item]));
  for (const item of next) map.set(item.id, item);
  items.value = [...map.values()];
}
function treeData(source = items.value) {
  const nodes = new Map(
    source.map((item) => [
      item.id,
      { ...item, key: item.id, children: [] as Record<string, any>[] },
    ]),
  );
  const roots: Record<string, any>[] = [];
  for (const item of source) {
    const node = nodes.get(item.id);
    if (!node) continue;
    const parent = item.parent_id ? nodes.get(item.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
async function load(search = '', resolveOnly = false) {
  const current = ++requestVersion;
  loading.value = true;
  try {
    const selected = valuesOf(value.value);
    const query = {
      dictionary_key: props.dictionaryKey,
      params: props.params,
      search,
      values: resolveOnly && selected.length > 0 ? selected : undefined,
    };
    let result = resolveOnly
      ? await queryAllDictionaryOptions(query)
      : await queryDictionary({ ...query, page_size: 50 });
    if (current !== requestVersion) return;
    if (props.expectedType && result.dictionary_type !== props.expectedType) {
      throw new Error(
        `数据字典 ${props.dictionaryKey} 类型应为 ${props.expectedType}`,
      );
    }
    dictionaryType.value = result?.dictionary_type ?? 'enum';
    merge(result?.items ?? [], !resolveOnly && dictionaryType.value === 'enum');
    return true;
  } catch (error) {
    if (current === requestVersion) {
      items.value = [];
      message.error(error instanceof Error ? error.message : '字典查询失败');
    }
    return false;
  } finally {
    if (current === requestVersion) loading.value = false;
  }
}
function search(text: string) {
  clearTimeout(timer);
  timer = setTimeout(() => void load(text), 300);
}
function selected(next: unknown) {
  let selectedValues: string[] = [];
  if (Array.isArray(next)) selectedValues = next;
  else if (typeof next === 'string') selectedValues = [next];
  const values = new Set(selectedValues);
  const found = items.value.filter((item) => values.has(item.value));
  emit('select', props.multiple ? found : found[0]);
}
async function initialize() {
  const current = ++initializationVersion;
  clearTimeout(timer);
  const loaded = await load();
  if (!loaded || current !== initializationVersion) return;
  const selectedValues = valuesOf(value.value);
  if (
    selectedValues.some(
      (selectedValue) =>
        !items.value.some((item) => item.value === selectedValue),
    )
  )
    await load('', true);
}
watch(
  () => props.dictionaryKey,
  () => {
    items.value = [];
    void initialize();
  },
);
watch(
  () => props.params,
  () => {
    items.value = [];
    void initialize();
  },
  { deep: true },
);
onMounted(() => void initialize());
</script>

<template>
  <TreeSelect
    v-if="dictionaryType === 'tree'"
    v-model:value="value"
    allow-clear
    class="w-full"
    :disabled="disabled"
    :filter-tree-node="false"
    :loading="loading"
    :multiple="multiple"
    :placeholder="placeholder"
    show-search
    :tree-data="treeData()"
    tree-node-filter-prop="label"
    @change="selected"
    @search="search"
  />
  <Select
    v-else
    v-model:value="value"
    allow-clear
    class="w-full"
    :disabled="disabled"
    :filter-option="false"
    :loading="loading"
    :mode="multiple ? 'multiple' : undefined"
    :options="items"
    :placeholder="placeholder"
    show-search
    @change="selected"
    @search="search"
    @dropdown-visible-change="(open) => open && items.length === 0 && load()"
  />
</template>
