<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

import {
  Button,
  Checkbox,
  Drawer,
  Empty,
  Input,
  message,
  Spin,
} from 'ant-design-vue';

export interface RoleAssignmentOption {
  description?: string;
  id: string;
  label: string;
  system?: boolean;
}

const props = defineProps<{
  loadOptions: () => Promise<RoleAssignmentOption[]>;
  loadSelected: () => Promise<string[]>;
  readonly?: boolean;
  save: (roleIds: string[]) => Promise<void>;
  subjectName?: string;
  subjectId?: string;
}>();
const emit = defineEmits<{ saved: [] }>();
const open = defineModel<boolean>('open', { default: false });
const loading = ref(false);
const saving = ref(false);
const keyword = ref('');
const options = ref<RoleAssignmentOption[]>([]);
const selected = ref<string[]>([]);
const loaded = ref(false);
let generation = 0;

async function load() {
  const current = ++generation;
  options.value = [];
  selected.value = [];
  loaded.value = false;
  saving.value = false;
  loading.value = true;
  try {
    const [roles, assigned] = await Promise.all([
      props.loadOptions(),
      props.loadSelected(),
    ]);
    if (current !== generation) return;
    options.value = roles;
    selected.value = assigned;
    loaded.value = true;
  } catch (error) {
    if (current === generation)
      message.error(
        error instanceof Error ? error.message : '角色数据加载失败',
      );
  } finally {
    if (current === generation) loading.value = false;
  }
}
async function submit() {
  if (
    !open.value ||
    props.readonly ||
    !loaded.value ||
    loading.value ||
    saving.value
  )
    return;
  const current = generation;
  saving.value = true;
  try {
    await props.save([...selected.value]);
    if (current !== generation) return;
    message.success('角色分配已保存');
    open.value = false;
    emit('saved');
  } catch (error) {
    if (current === generation)
      message.error(error instanceof Error ? error.message : '角色分配失败');
  } finally {
    if (current === generation) saving.value = false;
  }
}
watch(
  () => [open.value, props.subjectId],
  ([visible]) => {
    if (visible) {
      keyword.value = '';
      void load();
    } else {
      generation++;
      options.value = [];
      selected.value = [];
      loaded.value = false;
      loading.value = false;
      saving.value = false;
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  generation++;
});
</script>

<template>
  <Drawer
    v-model:open="open"
    :title="`分配角色 · ${subjectName || ''}`"
    width="520"
    :closable="!saving"
    :mask-closable="!saving"
  >
    <Input.Search
      v-model:value="keyword"
      allow-clear
      class="mb-3"
      placeholder="搜索角色名称或说明"
    />
    <Spin :spinning="loading">
      <Checkbox.Group v-model:value="selected" class="w-full">
        <div
          v-for="role in options.filter(
            (item) =>
              !keyword ||
              `${item.label} ${item.description || ''}`
                .toLocaleLowerCase('zh-CN')
                .includes(keyword.toLocaleLowerCase('zh-CN')),
          )"
          :key="role.id"
          class="mb-2 flex rounded border border-border px-3 py-2"
        >
          <Checkbox :disabled="readonly || loading || saving" :value="role.id">
            <div class="font-medium">{{ role.label }}</div>
            <div
              v-if="role.description"
              class="mt-1 text-xs text-muted-foreground"
            >
              {{ role.description }}
            </div>
          </Checkbox>
        </div>
      </Checkbox.Group>
      <Empty
        v-if="!loading && options.length === 0"
        description="暂无可分配角色"
      />
    </Spin>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :disabled="saving" @click="open = false">取消</Button>
        <Button v-if="!loading && !loaded" @click="load">重新加载</Button>
        <Button
          v-if="!readonly"
          type="primary"
          :disabled="!loaded || loading"
          :loading="saving"
          @click="submit"
        >
          保存
        </Button>
      </div>
    </template>
  </Drawer>
</template>
