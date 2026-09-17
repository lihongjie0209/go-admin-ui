<script setup lang="ts">
import type { TenantApplicationGrant } from '#/modules/platform/tenant-application-grants';

import { onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Divider,
  Drawer,
  Empty,
  Spin,
  Tag,
} from 'ant-design-vue';

import GoAuditSummary from '#/components/foundation/GoAuditSummary.vue';
import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';
import GoEntityReference from '#/components/foundation/GoEntityReference.vue';
import { usePageCapability } from '#/composables/use-page-capabilities';
import { getTenantApplicationGrant } from '#/modules/platform/tenant-application-grants';

const props = withDefaults(
  defineProps<{
    grantId?: string;
    open: boolean;
    tenantId?: string;
  }>(),
  { grantId: '', tenantId: '' },
);
const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const capability = usePageCapability({
  action: 'read',
  key: 'tenant.application-grant:read',
  resource: 'tenant.application-grant',
});
const record = ref<TenantApplicationGrant>();
const loading = ref(false);
const failure = ref('');
let generation = 0;
let controller: AbortController | undefined;

async function load() {
  const current = ++generation;
  controller?.abort();
  controller = undefined;
  record.value = undefined;
  failure.value = '';
  if (
    !props.open ||
    !props.tenantId ||
    !props.grantId ||
    !capability.allowed.value
  )
    return;
  controller = new AbortController();
  loading.value = true;
  try {
    const result = await getTenantApplicationGrant(
      props.tenantId,
      props.grantId,
      controller.signal,
    );
    if (current === generation) record.value = result;
  } catch (error) {
    if (
      current === generation &&
      !(error instanceof DOMException && error.name === 'AbortError')
    )
      failure.value =
        error instanceof Error ? error.message : '授权详情加载失败';
  } finally {
    if (current === generation) {
      loading.value = false;
      controller = undefined;
    }
  }
}

watch(
  [
    () => props.open,
    () => props.tenantId,
    () => props.grantId,
    capability.allowed,
  ],
  () => void load(),
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
    title="应用授权详情"
    :width="680"
    @close="emit('update:open', false)"
  >
    <Alert
      v-if="!capability.allowed.value"
      message="当前账号无权查看应用授权详情"
      show-icon
      type="warning"
    />
    <Alert v-else-if="failure" :message="failure" show-icon type="error">
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Spin v-else :spinning="loading">
      <template v-if="record">
        <Descriptions bordered :column="2" size="small">
          <DescriptionsItem label="租户" :span="2">
            <GoEntityReference
              :id="record.tenant_id"
              :name="record.tenant_name"
            />
          </DescriptionsItem>
          <DescriptionsItem label="应用" :span="2">
            <GoEntityReference
              :id="record.application_id"
              :name="record.application_name"
            />
          </DescriptionsItem>
          <DescriptionsItem label="应用编码">
            {{ record.application_code }}
          </DescriptionsItem>
          <DescriptionsItem label="应用首页">
            {{ record.application_home_path || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="授权状态">
            <Tag :color="record.status === 'active' ? 'green' : 'default'">
              {{ record.status === 'active' ? '已授权' : '已撤销' }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="版本">{{ record.version }}</DescriptionsItem>
          <DescriptionsItem label="生效时间">
            <GoDateTimeText :value="record.starts_at" />
          </DescriptionsItem>
          <DescriptionsItem label="失效时间">
            <GoDateTimeText :value="record.expires_at" />
          </DescriptionsItem>
        </Descriptions>
        <Divider orientation="left">审计信息</Divider>
        <GoAuditSummary :value="record" />
      </template>
      <Empty v-else-if="!loading" description="暂无授权详情" />
    </Spin>
  </Drawer>
</template>
