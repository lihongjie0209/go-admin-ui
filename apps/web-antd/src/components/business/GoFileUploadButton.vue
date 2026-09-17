<script setup lang="ts">
import type { CapabilityRequest } from '#/api/go';

import { ref } from 'vue';

import { Button, message } from 'ant-design-vue';

import { usePageCapability } from '#/composables/use-page-capabilities';
import { uploadFile } from '#/modules/files/file-actions';

const props = withDefaults(
  defineProps<{
    accept?: string;
    authorization?: CapabilityRequest;
  }>(),
  {
    accept: '',
    authorization: () => ({
      action: 'create',
      key: 'file.object:create',
      resource: 'file.object',
    }),
  },
);

const emit = defineEmits<{
  uploaded: [record: Record<string, unknown>];
}>();
const capability = usePageCapability(props.authorization);
const input = ref<HTMLInputElement>();
const uploading = ref(false);

async function selected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file || uploading.value || !capability.allowed.value) return;
  uploading.value = true;
  try {
    const record = await uploadFile(file);
    message.success('文件上传成功');
    emit('uploaded', record);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '文件上传失败');
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <span v-if="capability.allowed.value">
    <input
      ref="input"
      :accept="accept"
      class="hidden"
      type="file"
      @change="selected"
    />
    <Button :loading="uploading" type="primary" @click="input?.click()">
      上传文件
    </Button>
  </span>
</template>
