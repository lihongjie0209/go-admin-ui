<script setup lang="ts">
import type {
  PolicyLifecycleKind,
  PolicyRecord,
  PolicyVersionRecord,
} from '#/modules/policy/lifecycle-api';

import { computed, onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Drawer,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';
import GoPagination from '#/components/foundation/GoPagination.vue';
import { usePageCapability } from '#/composables/use-page-capabilities';
import {
  createPolicyVersion,
  defaultPolicySimulationInput,
  pagePolicyVersions,
  policyAuthorizationResource,
  publishPolicyVersion,
  simulatePolicy,
} from '#/modules/policy/lifecycle-api';

import PolicyDocumentDrawer from './PolicyDocumentDrawer.vue';
import PolicySimulationDrawer from './PolicySimulationDrawer.vue';

const props = defineProps<{
  kind: PolicyLifecycleKind;
  open: boolean;
  policy?: PolicyRecord;
}>();
const emit = defineEmits<{
  changed: [];
  'update:open': [value: boolean];
}>();

const resource = computed(() => policyAuthorizationResource(props.kind));
const createVersionCapability = usePageCapability({
  action: 'create-version',
  key: computed(() => `${resource.value}:create-version`).value,
  resource: resource.value,
});
const publishCapability = usePageCapability({
  action: 'publish',
  key: computed(() => `${resource.value}:publish`).value,
  resource: resource.value,
});
const simulateCapability = usePageCapability({
  action: 'simulate',
  key: computed(() => `${resource.value}:simulate`).value,
  resource: resource.value,
});

const versions = ref<PolicyVersionRecord[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const failure = ref('');
const documentOpen = ref(false);
const simulationOpen = ref(false);
const selectedVersion = ref<PolicyVersionRecord>();
const simulationInput = computed(() =>
  selectedVersion.value
    ? defaultPolicySimulationInput(props.kind, selectedVersion.value.document)
    : {},
);
let generation = 0;
let loadController: AbortController | undefined;

const columns = [
  {
    dataIndex: 'version_number',
    key: 'version_number',
    title: '版本',
    width: 90,
  },
  { dataIndex: 'status', key: 'status', title: '状态', width: 110 },
  { dataIndex: 'created_at', key: 'created_at', title: '创建时间', width: 190 },
  { dataIndex: 'created_by', key: 'created_by', title: '创建人', width: 180 },
  { key: 'action', title: '操作', width: 220 },
];

async function load() {
  const policyID = props.policy?.id;
  if (!props.open || !policyID) return;
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  const current = ++generation;
  loading.value = true;
  failure.value = '';
  try {
    const result = await pagePolicyVersions(
      props.kind,
      policyID,
      page.value,
      pageSize.value,
      controller.signal,
    );
    if (current !== generation) return;
    versions.value = result.items;
    total.value = result.total;
  } catch (error) {
    if (current === generation)
      failure.value = error instanceof Error ? error.message : '版本加载失败';
  } finally {
    if (current === generation) {
      loading.value = false;
      loadController = undefined;
    }
  }
}

function createDraft() {
  documentOpen.value = true;
}

async function saveDraft(document: string) {
  if (!props.policy) return;
  return await createPolicyVersion(props.kind, props.policy, document);
}

function draftSaved() {
  message.success('策略草稿已创建');
  emit('changed');
  emit('update:open', false);
}

async function publish(version: PolicyVersionRecord) {
  if (!props.policy) return;
  await publishPolicyVersion(props.kind, props.policy, version.version_number);
  message.success('策略版本已发布');
  emit('changed');
  emit('update:open', false);
}

function publishRecord(record: Record<string, unknown>) {
  return publish(record as PolicyVersionRecord);
}

function openSimulation(version: PolicyVersionRecord) {
  selectedVersion.value = version;
  simulationOpen.value = true;
}

function openSimulationRecord(record: Record<string, unknown>) {
  openSimulation(record as PolicyVersionRecord);
}

function versionStatusName(status: unknown) {
  return (
    {
      archived: '已归档',
      draft: '草稿',
      published: '已发布',
    }[String(status)] ?? String(status ?? '')
  );
}

async function runSimulation(
  input: Record<string, unknown>,
  signal?: AbortSignal,
) {
  if (!selectedVersion.value) throw new Error('请选择策略版本');
  return await simulatePolicy(
    props.kind,
    selectedVersion.value.document,
    input,
    signal,
  );
}

function changePage(value: { page: number; page_size: number }) {
  page.value = value.page;
  pageSize.value = value.page_size;
  void load();
}

watch(
  [() => props.open, () => props.policy?.id],
  ([open]) => {
    if (open) {
      page.value = 1;
      void load();
    } else {
      generation++;
      loadController?.abort();
      loadController = undefined;
      versions.value = [];
    }
  },
  { immediate: true },
);

onScopeDispose(() => {
  generation++;
  loadController?.abort();
});
</script>

<template>
  <Drawer
    :open="open"
    :title="policy ? `${policy.name} · 版本` : '策略版本'"
    :width="900"
    @close="emit('update:open', false)"
  >
    <div class="mb-4 flex items-center justify-between gap-3">
      <span class="text-sm text-muted-foreground">
        当前发布版本：{{ policy?.published_version_number ?? '尚未发布' }}
      </span>
      <Button
        v-if="createVersionCapability.allowed.value"
        type="primary"
        @click="createDraft"
      >
        创建新草稿
      </Button>
    </div>
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
    <Table
      :columns="columns"
      :data-source="versions"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <Tag
          v-if="column.key === 'status'"
          :color="
            record.status === 'published'
              ? 'green'
              : record.status === 'draft'
                ? 'blue'
                : 'default'
          "
        >
          {{ versionStatusName(record.status) }}
        </Tag>
        <GoDateTimeText
          v-else-if="column.key === 'created_at'"
          :value="record.created_at"
        />
        <Space v-else-if="column.key === 'action'">
          <Button
            v-if="simulateCapability.allowed.value"
            size="small"
            @click="openSimulationRecord(record)"
          >
            模拟
          </Button>
          <Popconfirm
            v-if="record.status === 'draft' && publishCapability.allowed.value"
            title="发布后会立即替换当前运行时策略，确定继续吗？"
            @confirm="publishRecord(record)"
          >
            <Button size="small" type="primary">发布</Button>
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
    <PolicyDocumentDrawer
      v-if="policy"
      v-model:open="documentOpen"
      :initial-document="versions[0]?.document ?? ''"
      :save="saveDraft"
      title="创建策略草稿"
      @saved="draftSaved"
    />
    <PolicySimulationDrawer
      v-model:open="simulationOpen"
      :initial-input="simulationInput"
      :run="runSimulation"
      title="模拟策略求值"
    />
  </Drawer>
</template>
