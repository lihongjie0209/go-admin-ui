<script setup lang="ts">
import type { NormalizedTreeRecord } from '#/components/foundation/tree-contract';
import type { TenantMemberCandidate } from '#/modules/tenant/department-member-assignment';

import { computed, onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Drawer,
  Input,
  message,
  Popconfirm,
  Radio,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';
import { useFrontendAction } from '#/composables/use-frontend-action';
import { usePageCapability } from '#/composables/use-page-capabilities';
import {
  loadDepartmentMemberAssignment,
  saveDepartmentMemberAssignment,
} from '#/modules/tenant/department-member-assignment';

const props = defineProps<{
  department: NormalizedTreeRecord | null;
  open: boolean;
}>();
const emit = defineEmits<{ 'update:open': [open: boolean] }>();

const runFrontendAction = useFrontendAction();
const capability = usePageCapability({
  action: 'assign-member',
  key: 'tenant.department:assign-member',
  resource: 'tenant.department',
});
const candidates = ref<TenantMemberCandidate[]>([]);
const selectedIDs = ref<string[]>([]);
const primaryID = ref('');
const keyword = ref('');
const loading = ref(false);
const saving = ref(false);
const loadError = ref<unknown>();
const disabledAssignedCount = ref(0);
let generation = 0;
let controller: AbortController | undefined;

const filteredCandidates = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase('zh-CN');
  if (!query) return candidates.value;
  return candidates.value.filter((item) =>
    [item.username, item.display_name].some((value) =>
      value.toLocaleLowerCase('zh-CN').includes(query),
    ),
  );
});
function close() {
  emit('update:open', false);
}

async function load() {
  if (!props.open || !props.department || !capability.allowed.value) return;
  const current = ++generation;
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  loadError.value = undefined;
  try {
    const result = await loadDepartmentMemberAssignment(
      props.department.id,
      controller.signal,
    );
    if (current !== generation) return;
    candidates.value = result.candidates;
    const activeIDs = new Set(
      result.candidates
        .filter((item) => item.status === 'active')
        .map((item) => item.id),
    );
    selectedIDs.value = result.assigned
      .map((item) => item.membership_id)
      .filter((id) => activeIDs.has(id));
    disabledAssignedCount.value = result.assigned.filter(
      (item) => item.status === 'disabled',
    ).length;
    primaryID.value =
      result.assigned.find(
        (item) => item.is_primary && activeIDs.has(item.membership_id),
      )?.membership_id ?? '';
  } catch (error) {
    if (
      current === generation &&
      !(error instanceof DOMException && error.name === 'AbortError')
    ) {
      loadError.value = error;
      candidates.value = [];
      selectedIDs.value = [];
      primaryID.value = '';
      disabledAssignedCount.value = 0;
    }
  } finally {
    if (current === generation) loading.value = false;
  }
}

function onSelectionChange(keys: Array<number | string>) {
  selectedIDs.value = keys.map(String);
  if (primaryID.value && !selectedIDs.value.includes(primaryID.value)) {
    primaryID.value = '';
  }
}

async function save() {
  const department = props.department;
  if (!department || !capability.allowed.value || saving.value) return;
  saving.value = true;
  try {
    await runFrontendAction(
      'tenant.department:assign-member',
      department.id,
      () =>
        saveDepartmentMemberAssignment({
          departmentID: department.id,
          membershipIDs: selectedIDs.value,
          primaryMembershipID: primaryID.value || undefined,
        }),
    );
    message.success('部门成员已更新');
    close();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
}

watch(
  [() => props.open, () => props.department?.id, capability.allowed],
  ([open, _id, allowed]) => {
    if (open && allowed) void load();
    if (open && !allowed && !capability.loading.value) close();
    if (!open) {
      generation++;
      controller?.abort();
      candidates.value = [];
      selectedIDs.value = [];
      primaryID.value = '';
      disabledAssignedCount.value = 0;
      keyword.value = '';
      loadError.value = undefined;
    }
  },
  { immediate: true },
);
onScopeDispose(() => {
  generation++;
  controller?.abort();
});
</script>

<template>
  <Drawer
    :open="open"
    :title="`分配部门成员 · ${department?.name ?? ''}`"
    width="760"
    @close="close"
  >
    <Space class="w-full" direction="vertical" size="middle">
      <Alert
        message="成员只能从当前租户选择。设置主部门会清除该成员原有的主部门标记。"
        show-icon
        type="info"
      />
      <Alert
        v-if="disabledAssignedCount > 0"
        :message="`${disabledAssignedCount} 名停用成员不会保留在本部门，请确认后保存。`"
        show-icon
        type="warning"
      />
      <Alert v-if="loadError" message="成员数据加载失败" show-icon type="error">
        <template #action>
          <Button size="small" @click="load">重试</Button>
        </template>
      </Alert>
      <Input.Search
        v-model:value="keyword"
        allow-clear
        placeholder="搜索用户名或姓名"
      />
      <Table
        :columns="[
          { title: '用户名', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'display_name' },
          { title: '状态', dataIndex: 'status', width: 90 },
          { title: '加入时间', dataIndex: 'joined_at', width: 180 },
          { title: '主部门', dataIndex: 'primary', width: 90 },
        ]"
        :data-source="filteredCandidates"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: false }"
        :row-key="(record: TenantMemberCandidate) => record.id"
        :row-selection="{
          getCheckboxProps: (record: TenantMemberCandidate) => ({
            disabled: record.status !== 'active',
          }),
          onChange: onSelectionChange,
          selectedRowKeys: selectedIDs,
        }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <Tag :color="record.status === 'active' ? 'green' : 'default'">
              {{ record.status === 'active' ? '启用' : '停用' }}
            </Tag>
          </template>
          <template v-else-if="column.dataIndex === 'joined_at'">
            <GoDateTimeText :value="record.joined_at" />
          </template>
          <template v-else-if="column.dataIndex === 'primary'">
            <Radio
              :checked="primaryID === record.id"
              :disabled="!selectedIDs.includes(record.id)"
              @click="primaryID = primaryID === record.id ? '' : record.id"
            />
          </template>
        </template>
      </Table>
    </Space>
    <template #footer>
      <Space>
        <Button @click="close">取消</Button>
        <Popconfirm
          title="确认以当前选择覆盖该部门的成员关系？"
          @confirm="save"
        >
          <Button
            :disabled="!capability.allowed.value || loading"
            :loading="saving"
            type="primary"
          >
            保存
          </Button>
        </Popconfirm>
      </Space>
    </template>
  </Drawer>
</template>
