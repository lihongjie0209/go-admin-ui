<script setup lang="ts">
withDefaults(defineProps<{ id?: null | string; name?: null | string }>(), {
  id: null,
  name: null,
});
</script>

<template>
  <span v-if="name" :title="id || undefined">{{ name }}</span>
  <span v-else class="text-muted-foreground">—</span>
</template>
