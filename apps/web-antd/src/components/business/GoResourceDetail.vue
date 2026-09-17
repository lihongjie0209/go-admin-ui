<script setup lang="ts">
import type { ResourceDetailField } from './detail-contract';

import type { VersionedRecord } from '#/api/go';

import { computed, onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Divider,
  Drawer,
  Empty,
  Spin,
} from 'ant-design-vue';

import { createResourceApi } from '#/api/go';
import { errorMessage } from '#/components/foundation/error-presentation';
import GoAuditSummary from '#/components/foundation/GoAuditSummary.vue';
import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';
import GoDictionaryText from '#/components/foundation/GoDictionaryText.vue';
import GoEntityReference from '#/components/foundation/GoEntityReference.vue';
import GoStatusTag from '#/components/foundation/GoStatusTag.vue';
import { usePageCapability } from '#/composables/use-page-capabilities';

import { detailJSON, detailText } from './detail-contract';

const props = withDefaults(
  defineProps<{
    authorizationResource: string;
    endpoints: {
      create: string;
      delete: string;
      get: string;
      page: string;
      update: string;
    };
    fields: ResourceDetailField[];
    open: boolean;
    recordId?: string;
    title?: string;
    width?: number;
  }>(),
  {
    recordId: '',
    title: '详情',
    width: 640,
  },
);

const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const api = createResourceApi<Record<string, unknown> & VersionedRecord>({
  endpoints: props.endpoints,
});
const readCapability = usePageCapability({
  action: 'read',
  key: `${props.authorizationResource}:read`,
  resource: props.authorizationResource,
});
const record = ref<Record<string, unknown>>();
const loading = ref(false);
const loadError = ref<unknown>();
let generation = 0;
let controller: AbortController | undefined;

const allowed = computed(() => readCapability.allowed.value);

async function load() {
  const current = ++generation;
  controller?.abort();
  controller = undefined;
  record.value = undefined;
  loadError.value = undefined;
  if (!props.open || !props.recordId || !allowed.value) return;
  controller = new AbortController();
  loading.value = true;
  try {
    const result = await api.get(props.recordId, controller.signal);
    if (current === generation) record.value = result;
  } catch (error) {
    if (
      current === generation &&
      !(error instanceof DOMException && error.name === 'AbortError')
    )
      loadError.value = error;
  } finally {
    if (current === generation) loading.value = false;
  }
}

function close() {
  emit('update:open', false);
}

function stringValue(value: unknown) {
  return value === undefined || value === null ? null : String(value);
}

watch([() => props.open, () => props.recordId, allowed], () => void load(), {
  immediate: true,
});
onScopeDispose(() => {
  generation++;
  controller?.abort();
});
defineExpose({ load, record });
</script>

<template>
  <Drawer :open="open" :title="title" :width="width" @close="close">
    <Alert
      v-if="!allowed"
      message="当前账号无权查看该资源"
      show-icon
      type="warning"
    />
    <Alert
      v-else-if="loadError"
      :description="errorMessage(loadError, '详情加载失败')"
      message="详情加载失败"
      show-icon
      type="error"
    >
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Spin v-else :spinning="loading">
      <template v-if="record">
        <Descriptions bordered :column="2" size="small">
          <DescriptionsItem
            v-for="field in fields"
            :key="field.field"
            :label="field.label"
            :span="field.span"
          >
            <GoDateTimeText
              v-if="field.presentation === 'datetime'"
              :value="stringValue(record[field.field])"
            />
            <GoDictionaryText
              v-else-if="
                field.presentation === 'dictionary' && field.dictionaryKey
              "
              :dictionary-key="field.dictionaryKey"
              :value="stringValue(record[field.field])"
            />
            <GoEntityReference
              v-else-if="field.presentation === 'reference'"
              :id="stringValue(record[field.field])"
              :name="
                field.displayField
                  ? (record[field.displayField] as string)
                  : undefined
              "
            />
            <GoStatusTag
              v-else-if="field.presentation === 'status'"
              :label="
                field.displayField
                  ? String(record[field.displayField] ?? '')
                  : undefined
              "
              :value="String(record[field.field] ?? '')"
            />
            <pre
              v-else-if="field.presentation === 'json'"
              class="m-0 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs"
              >{{ detailJSON(record[field.field]) }}</pre>
            <template v-else-if="field.format">
              {{ field.format(record[field.field], record) }}
            </template>
            <template v-else>
              {{ detailText(record[field.field]) }}
            </template>
          </DescriptionsItem>
        </Descriptions>
        <Divider orientation="left">审计信息</Divider>
        <GoAuditSummary :value="record" />
      </template>
      <Empty v-else-if="!loading" description="暂无详情数据" />
    </Spin>
  </Drawer>
</template>
