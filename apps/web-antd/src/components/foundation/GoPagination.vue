<script setup lang="ts">
import { computed, watch } from 'vue';

import { Pagination } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    page: number;
    pageSize: number;
    pageSizeOptions?: number[];
    total: number;
  }>(),
  {
    disabled: false,
    pageSizeOptions: () => [20, 50, 100, 200],
  },
);

const emit = defineEmits<{
  change: [value: { page: number; page_size: number }];
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

const maximumPage = computed(() =>
  Math.max(1, Math.ceil(props.total / props.pageSize)),
);

function change(page: number, pageSize: number) {
  const normalizedPage = pageSize === props.pageSize ? page : 1;
  emit('update:page', normalizedPage);
  emit('update:pageSize', pageSize);
  emit('change', { page: normalizedPage, page_size: pageSize });
}

watch(maximumPage, (maximum) => {
  if (props.page <= maximum) return;
  emit('update:page', maximum);
  emit('change', { page: maximum, page_size: props.pageSize });
});
</script>

<template>
  <Pagination
    :current="page"
    :disabled="disabled"
    :page-size="pageSize"
    :page-size-options="pageSizeOptions.map(String)"
    show-less-items
    show-size-changer
    :show-total="(count: number) => `共 ${count} 条`"
    :total="total"
    @change="change"
  />
</template>
