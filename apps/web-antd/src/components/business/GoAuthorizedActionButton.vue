<script setup lang="ts">
import type { CapabilityRequest } from '#/api/go';

import { inject, ref } from 'vue';
import { routeLocationKey } from 'vue-router';

import { Button, message, Popconfirm } from 'ant-design-vue';

import { trackFrontendAction } from '#/api/go';
import { usePageCapability } from '#/composables/use-page-capabilities';

const props = withDefaults(
  defineProps<{
    authorization: CapabilityRequest;
    confirm?: string;
    danger?: boolean;
    label: string;
    resourceId?: string;
    run: () => Promise<void>;
    successMessage?: string;
  }>(),
  {
    confirm: '',
    danger: false,
    resourceId: '',
    successMessage: '操作成功',
  },
);

const emit = defineEmits<{ completed: [] }>();
const route = inject(routeLocationKey, null);
const capability = usePageCapability(props.authorization);
const loading = ref(false);

async function execute() {
  if (!capability.allowed.value || loading.value) return;
  loading.value = true;
  try {
    await trackFrontendAction(
      {
        application_id: String(route?.meta.applicationId ?? ''),
        event_name: props.authorization.key,
        page_route: route?.path ?? '',
        resource_id: props.resourceId ?? '',
      },
      props.run,
    );
    message.success(props.successMessage);
    emit('completed');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '操作失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Popconfirm
    v-if="confirm && capability.allowed.value"
    :title="confirm"
    @confirm="execute"
  >
    <Button :danger="danger" :loading="loading">{{ label }}</Button>
  </Popconfirm>
  <Button
    v-else-if="capability.allowed.value"
    :danger="danger"
    :loading="loading"
    @click="execute"
  >
    {{ label }}
  </Button>
</template>
