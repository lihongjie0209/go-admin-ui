<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Drawer,
  Form,
  FormItem,
  Input,
  Space,
} from 'ant-design-vue';

const props = defineProps<{
  initialInput?: Record<string, unknown>;
  open: boolean;
  run: (
    input: Record<string, unknown>,
    signal?: AbortSignal,
  ) => Promise<unknown>;
  title: string;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const input = ref('{}');
const result = ref('');
const failure = ref('');
const running = ref(false);
let generation = 0;
let controller: AbortController | undefined;

watch(
  () => props.open,
  (open) => {
    if (!open) {
      generation++;
      controller?.abort();
      controller = undefined;
      running.value = false;
      return;
    }
    input.value = JSON.stringify(props.initialInput ?? {}, null, 2);
    result.value = '';
    failure.value = '';
  },
);

async function simulate() {
  if (running.value) return;
  failure.value = '';
  result.value = '';
  let payload: unknown;
  try {
    payload = JSON.parse(input.value);
    if (!payload || Array.isArray(payload) || typeof payload !== 'object')
      throw new Error('模拟输入必须是 JSON 对象');
  } catch (error) {
    failure.value = error instanceof Error ? error.message : '模拟输入格式错误';
    return;
  }
  running.value = true;
  controller?.abort();
  controller = new AbortController();
  const current = ++generation;
  try {
    const response = await props.run(
      payload as Record<string, unknown>,
      controller.signal,
    );
    if (current === generation)
      result.value = JSON.stringify(response, null, 2);
  } catch (error) {
    if (current === generation)
      failure.value = error instanceof Error ? error.message : '策略模拟失败';
  } finally {
    if (current === generation) {
      running.value = false;
      controller = undefined;
    }
  }
}

onScopeDispose(() => {
  generation++;
  controller?.abort();
});
</script>

<template>
  <Drawer
    :open="open"
    :title="title"
    :width="720"
    @close="emit('update:open', false)"
  >
    <Alert
      class="mb-4"
      message="模拟只执行校验和求值，不保存策略，也不会修改运行时状态。"
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
      <FormItem label="模拟输入（JSON）" required>
        <Input.TextArea v-model:value="input" class="font-mono" :rows="14" />
      </FormItem>
      <FormItem v-if="result" label="求值结果">
        <Input.TextArea :value="result" class="font-mono" readonly :rows="12" />
      </FormItem>
    </Form>
    <template #footer>
      <div class="flex justify-end">
        <Space>
          <Button :disabled="running" @click="emit('update:open', false)">
            关闭
          </Button>
          <Button :loading="running" type="primary" @click="simulate">
            运行模拟
          </Button>
        </Space>
      </div>
    </template>
  </Drawer>
</template>
