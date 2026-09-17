<script setup lang="ts">
import PolicyLifecyclePage from '#/templates/policy/PolicyLifecyclePage.vue';
</script>

<template>
  <PolicyLifecyclePage
    description="维护当前租户的数据范围规则，发布后用于仓储层 SQL 过滤。"
    :kind="{ domain: 'data-permission', scope: 'tenant' }"
    title="租户数据权限策略"
  />
</template>
