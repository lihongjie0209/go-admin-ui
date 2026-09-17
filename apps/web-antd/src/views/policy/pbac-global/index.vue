<script setup lang="ts">
import PolicyLifecyclePage from '#/templates/policy/PolicyLifecyclePage.vue';
</script>

<template>
  <PolicyLifecyclePage
    description="维护平台级操作授权策略及其不可变发布版本。"
    :kind="{ domain: 'pbac', scope: 'global' }"
    title="全局操作策略"
  />
</template>
