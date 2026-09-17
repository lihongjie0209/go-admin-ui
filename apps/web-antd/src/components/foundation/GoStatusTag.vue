<script setup lang="ts">
import { computed } from 'vue';

import { Tag } from 'ant-design-vue';

const props = defineProps<{ label?: string; value: string }>();
const color = computed(
  () =>
    ({
      active: 'green',
      disabled: 'default',
      failed: 'red',
      pending: 'orange',
      revoked: 'red',
      success: 'green',
    })[props.value] ?? 'blue',
);
</script>

<template>
  <Tag :color="color">{{ label || value }}</Tag>
</template>
