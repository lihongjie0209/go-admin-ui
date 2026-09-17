<script setup lang="ts">
import type { CapabilityRequest } from '#/api/go';

import { ref } from 'vue';

import { Button, message, Popconfirm } from 'ant-design-vue';

import { useFrontendAction } from '#/composables/use-frontend-action';
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
const runFrontendAction = useFrontendAction();
const capability = usePageCapability(props.authorization);
const loading = ref(false);

async function execute() {
  if (!capability.allowed.value || loading.value) return;
  loading.value = true;
  try {
    await runFrontendAction(
      props.authorization.key,
      props.resourceId ?? '',
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
