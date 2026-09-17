<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{ empty?: string; value?: null | string }>(),
  { empty: '—', value: null },
);
const formatted = computed(() => {
  if (!props.value) return props.empty;
  const date = new Date(props.value);
  if (Number.isNaN(date.getTime())) return props.empty;
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Shanghai',
  }).format(date);
});
</script>

<template>
  <time :datetime="value || undefined">{{ formatted }}</time>
</template>
