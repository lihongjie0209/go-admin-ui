<script setup lang="ts">
import GoDictionarySelectControl from '#/components/business/GoDictionarySelectControl.vue';

defineProps<{
  dictionaryKey: string;
  disabled?: boolean;
  multiple?: boolean;
  params?: Record<string, unknown>;
  placeholder?: string;
}>();
const value = defineModel<string | string[]>('value');
</script>

<template>
  <GoDictionarySelectControl
    v-model:value="value"
    :dictionary-key="dictionaryKey"
    :disabled="disabled"
    expected-type="enum"
    :multiple="multiple"
    :params="params"
    :placeholder="placeholder"
  />
</template>
