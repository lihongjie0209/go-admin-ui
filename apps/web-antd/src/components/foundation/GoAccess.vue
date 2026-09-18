<script setup lang="ts">
import { Alert, Skeleton } from 'ant-design-vue';

import { usePageCapability } from '#/composables/use-page-capabilities';

const props = withDefaults(
  defineProps<{
    action: string;
    denied?: 'disable' | 'hide' | 'message';
    deniedMessage?: string;
    resource: string;
  }>(),
  { denied: 'hide', deniedMessage: '当前账号无权执行此操作' },
);

const capability = usePageCapability({
  action: props.action,
  key: `${props.resource}:${props.action}`,
  resource: props.resource,
});
</script>

<template>
  <Skeleton v-if="capability.loading.value" active :paragraph="false" />
  <Alert
    v-else-if="capability.error.value"
    message="权限状态暂时不可用"
    show-icon
    type="warning"
  />
  <slot v-else-if="capability.allowed.value"></slot>
  <span
    v-else-if="denied === 'disable'"
    aria-disabled="true"
    class="pointer-events-none opacity-50"
  >
    <slot name="disabled"></slot>
  </span>
  <Alert
    v-else-if="denied === 'message'"
    :message="deniedMessage"
    show-icon
    type="warning"
  />
</template>
