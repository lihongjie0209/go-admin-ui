<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Alert, Button, Input, message, Modal, Space } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    description?: string;
    open: boolean;
    secret: string;
    title?: string;
  }>(),
  {
    description: '该密钥关闭后将无法再次查看，请立即保存到安全位置。',
    title: '保存新密钥',
  },
);

const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const copied = ref(false);
const canClose = computed(() => copied.value || !props.secret);

watch(
  () => [props.open, props.secret],
  ([open]) => {
    if (open) copied.value = false;
  },
);

async function copySecret() {
  if (!props.secret) return;
  await navigator.clipboard.writeText(props.secret);
  copied.value = true;
  message.success('密钥已复制');
}

function close() {
  if (!canClose.value) {
    message.warning('请先复制密钥，再关闭窗口');
    return;
  }
  emit('update:open', false);
}
</script>

<template>
  <Modal
    :closable="canClose"
    :keyboard="false"
    :mask-closable="false"
    :open="open"
    :title="title"
    @cancel="close"
  >
    <div class="space-y-4">
      <Alert :message="description" show-icon type="warning" />
      <Input.Password :value="secret" readonly visibility-toggle />
    </div>
    <template #footer>
      <Space>
        <Button @click="copySecret">复制密钥</Button>
        <Button :disabled="!canClose" type="primary" @click="close">
          我已安全保存
        </Button>
      </Space>
    </template>
  </Modal>
</template>
