<script setup lang="ts">
import PolicyLifecyclePage from '#/templates/policy/PolicyLifecyclePage.vue';
</script>

<template>
  <PolicyLifecyclePage
    description="维护跨租户数据范围规则，并通过模拟验证生成的数据谓词。"
    :kind="{ domain: 'data-permission', scope: 'global' }"
    title="全局数据权限策略"
  />
</template>
