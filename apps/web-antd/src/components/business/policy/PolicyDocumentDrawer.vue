<script setup lang="ts">
import { ref, watch } from 'vue';

import {
  Alert,
  Button,
  Drawer,
  Form,
  FormItem,
  Input,
  Space,
} from 'ant-design-vue';

import { parsePolicyDocument } from '#/modules/policy/lifecycle-api';

const props = withDefaults(
  defineProps<{
    initialDocument?: string;
    open: boolean;
    save: (document: string) => Promise<unknown>;
    title: string;
  }>(),
  { initialDocument: '' },
);

const emit = defineEmits<{
  saved: [result: unknown];
  'update:open': [value: boolean];
}>();
const document = ref('');
const failure = ref('');
const saving = ref(false);

watch(
  () => [props.open, props.initialDocument] as const,
  ([open, initial]) => {
    if (!open) return;
    document.value = initial;
    failure.value = '';
  },
  { immediate: true },
);

async function submit() {
  if (saving.value) return;
  failure.value = '';
  try {
    parsePolicyDocument(document.value);
  } catch (error) {
    failure.value = error instanceof Error ? error.message : '策略文档格式错误';
    return;
  }
  saving.value = true;
  try {
    const result = await props.save(document.value);
    emit('saved', result);
    emit('update:open', false);
  } catch (error) {
    failure.value = error instanceof Error ? error.message : '策略保存失败';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Drawer
    :closable="!saving"
    :keyboard="!saving"
    :mask-closable="false"
    :open="open"
    :title="title"
    :width="760"
    @close="$emit('update:open', false)"
  >
    <Alert
      class="mb-4"
      message="策略使用严格 YAML。保存会创建不可变草稿，不会直接影响运行时。"
      show-icon
      type="info"
    />
    <Alert
      v-if="failure"
      class="mb-4"
      :message="failure"
      show-icon
      type="error"
    />
    <Form layout="vertical">
      <FormItem label="策略文档" required>
        <Input.TextArea
          v-model:value="document"
          class="font-mono"
          :disabled="saving"
          :rows="25"
          spellcheck="false"
        />
      </FormItem>
    </Form>
    <template #footer>
      <div class="flex justify-end">
        <Space>
          <Button :disabled="saving" @click="$emit('update:open', false)">
            取消
          </Button>
          <Button :loading="saving" type="primary" @click="submit">
            保存草稿
          </Button>
        </Space>
      </div>
    </template>
  </Drawer>
</template>
