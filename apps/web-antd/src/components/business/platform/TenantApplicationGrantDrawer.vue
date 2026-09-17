<script setup lang="ts">
import type { Dayjs } from 'dayjs';

import type {
  ApplicationOption,
  TenantApplicationGrant,
} from '#/modules/platform/tenant-application-grants';

import { computed, onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  FormItem,
  Input,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';
import GoPagination from '#/components/foundation/GoPagination.vue';
import { useFrontendAction } from '#/composables/use-frontend-action';
import { usePageCapability } from '#/composables/use-page-capabilities';
import {
  findTenantApplicationGrant,
  grantTenantApplication,
  listActiveApplications,
  pageTenantApplicationGrants,
  revokeTenantApplication,
} from '#/modules/platform/tenant-application-grants';

import TenantApplicationGrantDetail from './TenantApplicationGrantDetail.vue';

const props = defineProps<{
  open: boolean;
  tenant?: { id: string; name: string };
}>();
const emit = defineEmits<{
  changed: [];
  'update:open': [value: boolean];
}>();

const runFrontendAction = useFrontendAction();
const listCapability = usePageCapability({
  action: 'list',
  key: 'tenant.application-grant:list',
  resource: 'tenant.application-grant',
});
const grantCapability = usePageCapability({
  action: 'grant',
  key: 'tenant.application-grant:grant',
  resource: 'tenant.application-grant',
});
const revokeCapability = usePageCapability({
  action: 'revoke',
  key: 'tenant.application-grant:revoke',
  resource: 'tenant.application-grant',
});
const readCapability = usePageCapability({
  action: 'read',
  key: 'tenant.application-grant:read',
  resource: 'tenant.application-grant',
});
const grants = ref<TenantApplicationGrant[]>([]);
const applications = ref<ApplicationOption[]>([]);
const applicationID = ref('');
const validity = ref<[Dayjs, Dayjs] | undefined>();
const keyword = ref('');
const status = ref<'' | 'active' | 'revoked'>('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const failure = ref('');
const detailOpen = ref(false);
const detailGrantID = ref('');
let generation = 0;
let controller: AbortController | undefined;

const applicationOptions = computed(() =>
  applications.value.map((item) => ({
    label: `${item.name}（${item.code}）`,
    value: item.id,
  })),
);
const selectedGrant = computed(() =>
  grants.value.find((item) => item.application_id === applicationID.value),
);
const saveLabel = computed(() => {
  if (!selectedGrant.value) return '授予应用';
  return selectedGrant.value.status === 'active' ? '更新有效期' : '重新授予';
});
const columns = [
  {
    dataIndex: 'application_name',
    key: 'application_name',
    title: '应用',
    width: 180,
  },
  {
    dataIndex: 'application_code',
    key: 'application_code',
    title: '应用编码',
    width: 150,
  },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { dataIndex: 'starts_at', key: 'starts_at', title: '生效时间', width: 180 },
  { dataIndex: 'expires_at', key: 'expires_at', title: '失效时间', width: 180 },
  { key: 'action', title: '操作', width: 150 },
];

function showDetail(record: TenantApplicationGrant) {
  detailGrantID.value = record.id;
  detailOpen.value = true;
}

async function load() {
  if (!props.open || !props.tenant || !listCapability.allowed.value) return;
  controller?.abort();
  const currentController = new AbortController();
  controller = currentController;
  const current = ++generation;
  loading.value = true;
  failure.value = '';
  try {
    const [grantPage, options] = await Promise.all([
      pageTenantApplicationGrants(
        {
          keyword: keyword.value,
          page: page.value,
          page_size: pageSize.value,
          sort: [{ direction: 'asc', field: 'application_name' }],
          statuses: status.value ? [status.value] : [],
          tenant_id: props.tenant.id,
        },
        currentController.signal,
      ),
      applications.value.length > 0
        ? Promise.resolve(applications.value)
        : listActiveApplications(currentController.signal),
    ]);
    if (current !== generation) return;
    grants.value = grantPage.items;
    total.value = grantPage.total;
    applications.value = options;
  } catch (error) {
    if (current === generation)
      failure.value =
        error instanceof Error ? error.message : '应用授权加载失败';
  } finally {
    if (current === generation) {
      loading.value = false;
      controller = undefined;
    }
  }
}

async function saveGrant() {
  const tenant = props.tenant;
  if (!tenant || !applicationID.value || saving.value) return;
  saving.value = true;
  try {
    const existing = await findTenantApplicationGrant(
      tenant.id,
      applicationID.value,
    );
    await runFrontendAction(
      'tenant.application-grant:grant',
      applicationID.value,
      () =>
        grantTenantApplication({
          application_id: applicationID.value,
          expires_at: validity.value?.[1]?.toISOString() ?? null,
          starts_at: validity.value?.[0]?.toISOString() ?? null,
          tenant_id: tenant.id,
          version: existing?.version ?? 0,
        }),
    );
    message.success('租户应用授权已保存');
    emit('changed');
    await load();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存应用授权失败');
  } finally {
    saving.value = false;
  }
}

async function revoke(record: Record<string, unknown>) {
  const grant = record as TenantApplicationGrant;
  try {
    await runFrontendAction('tenant.application-grant:revoke', grant.id, () =>
      revokeTenantApplication(grant),
    );
    message.success('应用授权已撤销');
    emit('changed');
    await load();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '撤销应用授权失败');
  }
}

function search(value: string) {
  keyword.value = value.trim();
  page.value = 1;
  void load();
}

function filterStatus(value: unknown) {
  status.value = value === 'active' || value === 'revoked' ? value : '';
  page.value = 1;
  void load();
}

function changePage(value: { page: number; page_size: number }) {
  page.value = value.page;
  pageSize.value = value.page_size;
  void load();
}

watch(
  [
    () => props.open,
    () => props.tenant?.id,
    () => listCapability.allowed.value,
  ],
  ([open, , allowed]) => {
    if (open && allowed) {
      page.value = 1;
      keyword.value = '';
      status.value = '';
      applicationID.value = '';
      validity.value = undefined;
      applications.value = [];
      void load();
    } else {
      generation++;
      controller?.abort();
      controller = undefined;
      grants.value = [];
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
    :mask-closable="!saving"
    :open="open"
    :title="tenant ? `应用授权 · ${tenant.name}` : '应用授权'"
    :width="1040"
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

    <Form v-if="grantCapability.allowed.value" class="mb-4" layout="inline">
      <FormItem label="应用" required>
        <Select
          v-model:value="applicationID"
          :disabled="saving"
          :options="applicationOptions"
          placeholder="选择应用"
          show-search
          style="width: 260px"
        />
      </FormItem>
      <FormItem label="有效期">
        <DatePicker.RangePicker
          v-model:value="validity"
          :disabled="saving"
          show-time
          style="width: 360px"
        />
      </FormItem>
      <FormItem>
        <Button
          :disabled="!applicationID"
          :loading="saving"
          type="primary"
          @click="saveGrant"
        >
          {{ saveLabel }}
        </Button>
      </FormItem>
    </Form>

    <div class="mb-3 flex flex-wrap justify-between gap-3">
      <Input.Search
        allow-clear
        placeholder="搜索应用编码或名称"
        style="width: 260px"
        @search="search"
      />
      <Select
        :options="[
          { label: '全部状态', value: '' },
          { label: '已授权', value: 'active' },
          { label: '已撤销', value: 'revoked' },
        ]"
        style="width: 130px"
        :value="status"
        @change="filterStatus"
      />
    </div>

    <Table
      :columns="columns"
      :data-source="grants"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <Tag
          v-if="column.key === 'status'"
          :color="record.status === 'active' ? 'green' : 'default'"
        >
          {{ record.status === 'active' ? '已授权' : '已撤销' }}
        </Tag>
        <GoDateTimeText
          v-else-if="column.key === 'starts_at' || column.key === 'expires_at'"
          :value="record[column.key]"
        />
        <Space v-else-if="column.key === 'action'">
          <Button
            v-if="readCapability.allowed.value"
            size="small"
            type="link"
            @click="showDetail(record as TenantApplicationGrant)"
          >
            详情
          </Button>
          <Popconfirm
            v-if="record.status === 'active' && revokeCapability.allowed.value"
            title="撤销后该租户将不能再使用此应用，确定继续吗？"
            @confirm="revoke(record)"
          >
            <Button danger size="small" type="link">撤销</Button>
          </Popconfirm>
        </Space>
      </template>
    </Table>
    <GoPagination
      class="mt-4"
      :page="page"
      :page-size="pageSize"
      :total="total"
      @change="changePage"
    />
    <TenantApplicationGrantDetail
      v-model:open="detailOpen"
      :grant-id="detailGrantID"
      :tenant-id="tenant?.id"
    />
  </Drawer>
</template>
