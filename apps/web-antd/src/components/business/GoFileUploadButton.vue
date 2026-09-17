<script setup lang="ts">
import type { CapabilityRequest } from '#/api/go';

import { onScopeDispose, ref } from 'vue';

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
let uploadController: AbortController | undefined;
let uploadGeneration = 0;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function selected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file || uploading.value || !capability.allowed.value) return;
  const generation = ++uploadGeneration;
  const controller = new AbortController();
  uploadController = controller;
  uploading.value = true;
  try {
    const record = await uploadFile(file, controller.signal);
    if (generation !== uploadGeneration || controller.signal.aborted) return;
    message.success('文件上传成功');
    emit('uploaded', record);
  } catch (error) {
    if (generation === uploadGeneration && !isAbortError(error)) {
      message.error(error instanceof Error ? error.message : '文件上传失败');
    }
  } finally {
    if (generation === uploadGeneration) {
      uploading.value = false;
      uploadController = undefined;
    }
  }
}

onScopeDispose(() => {
  uploadGeneration++;
  uploadController?.abort();
  uploadController = undefined;
});
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
