<script setup lang="ts">
import PolicyLifecyclePage from '#/templates/policy/PolicyLifecyclePage.vue';
</script>

<template>
  <PolicyLifecyclePage
    description="维护当前租户的操作授权策略，策略范围自动绑定当前租户。"
    :kind="{ domain: 'pbac', scope: 'tenant' }"
    title="租户操作策略"
  />
</template>
