<script setup lang="ts">
import type { RuntimeStatus } from '#/modules/platform/runtime-status';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Spin,
  Tag,
} from 'ant-design-vue';

import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';
import { getRuntimeStatus } from '#/modules/platform/runtime-status';

const status = ref<RuntimeStatus>();
const loading = ref(false);
const failure = ref('');
const checkedAt = ref<Date>();
let controller: AbortController | undefined;

const dependencies = computed(() =>
  Object.entries(status.value?.readiness.dependencies ?? {})
    .map(([name, value]) => ({ name, value }))
    .toSorted((left, right) => left.name.localeCompare(right.name)),
);

function statusLabel(value: string) {
  return (
    (
      { disabled: '未启用', down: '不可用', up: '正常' } as Record<
        string,
        string
      >
    )[value] ?? value
  );
}

function statusColor(value: string) {
  return (
    (
      { disabled: 'default', down: 'error', up: 'success' } as Record<
        string,
        string
      >
    )[value] ?? 'warning'
  );
}

function refresh() {
  controller?.abort();
  const currentController = new AbortController();
  controller = currentController;
  loading.value = true;
  failure.value = '';
  return getRuntimeStatus(currentController.signal).then(
    (value) => {
      if (currentController.signal.aborted) return;
      status.value = value;
      checkedAt.value = new Date();
      loading.value = false;
    },
    (error: unknown) => {
      if (currentController.signal.aborted) return;
      failure.value =
        error instanceof Error ? error.message : '运行状态加载失败';
      loading.value = false;
    },
  );
}

onMounted(() => {
  void refresh();
});
onBeforeUnmount(() => controller?.abort());

defineExpose({ refresh });
</script>

<template>
  <div class="runtime-status" aria-live="polite">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Tag :color="status?.ready ? 'success' : 'error'">
          {{ status?.ready ? '服务就绪' : '服务未就绪' }}
        </Tag>
        <span v-if="checkedAt" class="text-sm text-muted-foreground">
          最近检查：{{
            checkedAt.toLocaleTimeString('zh-CN', { hour12: false })
          }}
        </span>
      </div>
      <Button :loading="loading" @click="refresh">刷新状态</Button>
    </div>

    <Alert
      v-if="failure"
      class="mb-4"
      message="运行状态加载失败"
      :description="failure"
      show-icon
      type="error"
    />

    <Spin :spinning="loading && !status">
      <div
        v-if="status"
        class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
      >
        <Card title="构建与进程" :bordered="true">
          <Descriptions :column="1" size="small">
            <DescriptionsItem label="版本">
              {{ status.build.version || '—' }}
            </DescriptionsItem>
            <DescriptionsItem label="Git commit">
              <code class="select-all">{{ status.build.commit || '—' }}</code>
            </DescriptionsItem>
            <DescriptionsItem label="构建时间">
              {{ status.build.build_time || '—' }}
            </DescriptionsItem>
            <DescriptionsItem label="启动时间">
              <GoDateTimeText :value="status.build.started_at" />
            </DescriptionsItem>
            <DescriptionsItem label="运行时长">
              {{ status.build.uptime || '—' }}
            </DescriptionsItem>
            <DescriptionsItem label="进程存活">
              <Tag :color="statusColor(status.liveness.status)">
                {{ statusLabel(status.liveness.status) }}
              </Tag>
            </DescriptionsItem>
          </Descriptions>
        </Card>

        <Card title="基础依赖" :bordered="true">
          <div v-if="dependencies.length" class="divide-y divide-border">
            <div
              v-for="dependency in dependencies"
              :key="dependency.name"
              class="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              :data-dependency="dependency.name"
            >
              <div>
                <div class="font-medium text-foreground">
                  {{ dependency.name }}
                </div>
                <div class="mt-1 text-xs text-muted-foreground">
                  延迟 {{ dependency.value.latency || '—' }}
                </div>
              </div>
              <Tag :color="statusColor(dependency.value.status)">
                {{ statusLabel(dependency.value.status) }}
              </Tag>
            </div>
          </div>
          <Alert v-else message="未返回依赖检查结果" show-icon type="warning" />
        </Card>
      </div>
    </Spin>
  </div>
</template>
