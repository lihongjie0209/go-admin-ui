<script setup lang="ts">
import { IconifyIcon } from '@vben/icons';

withDefaults(
  defineProps<{
    icon?: null | string;
    size?: number;
  }>(),
  { icon: '', size: 18 },
);
</script>

<template>
  <IconifyIcon
    v-if="icon"
    :icon="icon"
    :style="{ fontSize: `${size}px` }"
    aria-hidden="true"
  />
  <span v-else class="text-muted-foreground">—</span>
</template>
