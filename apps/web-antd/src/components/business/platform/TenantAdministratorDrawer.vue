<script setup lang="ts">
import type {
  AdministratorCandidate,
  TenantAdministratorScope,
} from '#/modules/platform/tenant-authorization';

import { onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Drawer,
  Input,
  message,
  Popconfirm,
  Select,
  Table,
  Tag,
} from 'ant-design-vue';

import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';
import GoPagination from '#/components/foundation/GoPagination.vue';
import { useFrontendAction } from '#/composables/use-frontend-action';
import {
  pageAdministratorCandidates,
  setTenantAdministrator,
} from '#/modules/platform/tenant-authorization';

const props = withDefaults(
  defineProps<{
    open: boolean;
    scope?: TenantAdministratorScope;
    tenant?: { id: string; name: string };
  }>(),
  { scope: 'platform', tenant: undefined },
);
const emit = defineEmits<{
  changed: [];
  'update:open': [value: boolean];
}>();

const runFrontendAction = useFrontendAction();
const items = ref<AdministratorCandidate[]>([]);
const keyword = ref('');
const status = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const loading = ref(false);
const failure = ref('');
const mutating = ref(new Set<string>());
let generation = 0;
let controller: AbortController | undefined;

const columns = [
  { dataIndex: 'username', key: 'username', title: '用户名', width: 160 },
  {
    dataIndex: 'display_name',
    key: 'display_name',
    title: '显示名称',
    width: 160,
  },
  { dataIndex: 'status', key: 'status', title: '成员状态', width: 100 },
  { dataIndex: 'joined_at', key: 'joined_at', title: '加入时间', width: 180 },
  {
    dataIndex: 'is_administrator',
    key: 'is_administrator',
    title: '管理员',
    width: 100,
  },
  { key: 'action', title: '操作', width: 120 },
];

async function load() {
  if (!props.open || !props.tenant) return;
  controller?.abort();
  const currentController = new AbortController();
  controller = currentController;
  const current = ++generation;
  loading.value = true;
  failure.value = '';
  try {
    const result = await pageAdministratorCandidates(
      {
        keyword: keyword.value,
        page: page.value,
        page_size: pageSize.value,
        statuses: status.value ? [status.value] : [],
        ...(props.scope === 'platform' ? { tenant_id: props.tenant.id } : {}),
      },
      currentController.signal,
      props.scope,
    );
    if (current !== generation) return;
    items.value = result.items;
    total.value = result.total;
  } catch (error) {
    if (current === generation)
      failure.value =
        error instanceof Error ? error.message : '管理员列表加载失败';
  } finally {
    if (current === generation) {
      loading.value = false;
      controller = undefined;
    }
  }
}

async function setAdministrator(
  source: Record<string, unknown>,
  enabled: boolean,
) {
  const record = source as unknown as AdministratorCandidate;
  const tenant = props.tenant;
  if (!tenant || mutating.value.has(record.membership_id)) return;
  mutating.value = new Set(mutating.value).add(record.membership_id);
  try {
    await runFrontendAction(
      props.scope === 'platform'
        ? 'tenant:assign-administrator'
        : 'tenant.authorization:assign-administrator',
      record.membership_id,
      () =>
        setTenantAdministrator(
          {
            enabled,
            membership_id: record.membership_id,
            tenant_id: tenant.id,
          },
          props.scope,
        ),
    );
    message.success(enabled ? '已设为租户管理员' : '已取消租户管理员');
    emit('changed');
    await load();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '管理员设置失败');
  } finally {
    const next = new Set(mutating.value);
    next.delete(record.membership_id);
    mutating.value = next;
  }
}

function search(value: string) {
  keyword.value = value.trim();
  page.value = 1;
  void load();
}

function filterStatus(value: unknown) {
  status.value = value === 'active' || value === 'disabled' ? value : '';
  page.value = 1;
  void load();
}

watch(
  [() => props.open, () => props.tenant?.id],
  ([open]) => {
    if (open) {
      keyword.value = '';
      status.value = '';
      page.value = 1;
      void load();
    } else {
      generation++;
      controller?.abort();
      controller = undefined;
      items.value = [];
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
    :title="tenant ? `租户管理员 · ${tenant.name}` : '租户管理员'"
    :width="960"
    @close="emit('update:open', false)"
  >
    <Alert
      v-if="failure"
      class="mb-4"
      :message="failure"
      show-icon
      type="error"
    >
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <div class="mb-4 flex flex-wrap justify-between gap-3">
      <Input.Search
        allow-clear
        placeholder="搜索用户名或显示名称"
        style="width: 280px"
        @search="search"
      />
      <Select
        :options="[
          { label: '全部成员状态', value: '' },
          { label: '正常', value: 'active' },
          { label: '停用', value: 'disabled' },
        ]"
        style="width: 150px"
        :value="status"
        @change="filterStatus"
      />
    </div>
    <Table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      row-key="membership_id"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <Tag
          v-if="column.key === 'status'"
          :color="record.status === 'active' ? 'green' : 'default'"
        >
          {{ record.status === 'active' ? '正常' : '停用' }}
        </Tag>
        <Tag
          v-else-if="column.key === 'is_administrator'"
          :color="record.is_administrator ? 'blue' : 'default'"
        >
          {{ record.is_administrator ? '是' : '否' }}
        </Tag>
        <GoDateTimeText
          v-else-if="column.key === 'joined_at'"
          :value="record.joined_at"
        />
        <template v-else-if="column.key === 'action'">
          <Popconfirm
            :title="
              record.is_administrator
                ? '确认取消该管理员？'
                : '确认设为租户管理员？'
            "
            @confirm="setAdministrator(record, !record.is_administrator)"
          >
            <Button
              :danger="record.is_administrator"
              :disabled="record.status !== 'active' && !record.is_administrator"
              :loading="mutating.has(record.membership_id)"
              size="small"
              type="link"
            >
              {{ record.is_administrator ? '取消管理员' : '设为管理员' }}
            </Button>
          </Popconfirm>
        </template>
      </template>
    </Table>
    <div class="mt-4 flex justify-end">
      <GoPagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :disabled="loading"
        :total="total"
        @change="load"
      />
    </div>
  </Drawer>
</template>
