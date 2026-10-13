<script setup lang="ts">
import type { NormalizedTreeRecord } from '#/components/foundation/tree-contract';

import { computed, ref, watch } from 'vue';

import { Alert, Button, Drawer, message, Select, Spin } from 'ant-design-vue';

import { getPermissionActions, setPermissionActions } from '#/api/go';
import { errorMessage } from '#/components/foundation/error-presentation';
import GoAccess from '#/components/foundation/GoAccess.vue';
import { loadScopedPermissionActionOptions } from '#/modules/platform/authorization-options';

const props = defineProps<{ selected: NormalizedTreeRecord | null }>();
const emit = defineEmits<{ saved: [] }>();

const open = ref(false);
const loading = ref(false);
const saving = ref(false);
const failure = ref('');
const actionIDs = ref<string[]>([]);
const options = ref<
  Array<{ disabled?: boolean; label: string; value: string }>
>([]);
let controller: AbortController | undefined;

const eligible = computed(
  () =>
    props.selected?.node_type === 'permission' &&
    props.selected.is_system !== true,
);

function close() {
  controller?.abort();
  open.value = false;
}

async function show() {
  const node = props.selected;
  if (!node || !eligible.value) return;
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal;
  open.value = true;
  loading.value = true;
  failure.value = '';
  actionIDs.value = [];
  options.value = [];
  try {
    const [links, scopedOptions] = await Promise.all([
      getPermissionActions(node.id, signal),
      loadScopedPermissionActionOptions(String(node.resource ?? ''), signal),
    ]);
    if (signal.aborted) return;
    const active = new Set(scopedOptions.map((item) => item.value));
    options.value = [
      ...scopedOptions,
      ...links
        .filter((link) => !active.has(link.id))
        .map((link) => ({
          disabled: true,
          label: `${link.resource_key}:${link.action_key} · 已停用，保存前请移除`,
          value: link.id,
        })),
    ];
    actionIDs.value = links.map((link) => link.id);
  } catch (error) {
    if (!signal.aborted)
      failure.value = errorMessage(error, '关联动作加载失败');
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

async function save() {
  const node = props.selected;
  if (!node || !eligible.value || loading.value || saving.value) return;
  if (actionIDs.value.length === 0 || actionIDs.value.length > 100) {
    failure.value = '一个权限必须关联 1 至 100 个动作';
    return;
  }
  const enabled = new Set(
    options.value
      .filter((option) => !option.disabled)
      .map((option) => option.value),
  );
  if (actionIDs.value.some((id) => !enabled.has(id))) {
    failure.value = '请先移除已停用的关联动作';
    return;
  }
  saving.value = true;
  failure.value = '';
  try {
    await setPermissionActions(node.id, Number(node.version), actionIDs.value);
    message.success('关联动作已保存');
    close();
    emit('saved');
  } catch (error) {
    failure.value = errorMessage(error, '关联动作保存失败');
  } finally {
    saving.value = false;
  }
}

watch(() => props.selected?.id, close);
</script>

<template>
  <GoAccess v-if="eligible" action="update" resource="permission.definition">
    <Button @click="show">关联动作</Button>
  </GoAccess>
  <Drawer :open="open" title="关联动作" :width="560" @close="close">
    <p>
      为
      {{ selected?.name }}
      选择同范围的资源动作。保存后权限将按新的关联关系生效。
    </p>
    <Alert
      v-if="failure"
      type="error"
      :message="failure"
      show-icon
      class="mb-3"
    />
    <Spin :spinning="loading">
      <Select
        v-model:value="actionIDs"
        class="w-full"
        mode="multiple"
        :options="options"
        option-filter-prop="label"
        placeholder="选择资源动作"
        show-search
      />
    </Spin>
    <template #footer>
      <Button class="mr-2" @click="close">取消</Button>
      <Button
        type="primary"
        :disabled="loading || !!failure"
        :loading="saving"
        @click="save"
        >
保存关联
</Button
      >
    </template>
  </Drawer>
</template>
