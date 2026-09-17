<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { scheduledJobRunPageContract } from '#/modules/platform/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const route = useRoute();
const jobID = computed(() => String(route.params.scheduledJobId ?? ''));
const jobName = computed(() => String(route.query.name ?? ''));
const contract = computed(() => scheduledJobRunPageContract(jobID.value));
</script>

<template>
  <Page
    :title="jobName ? `${jobName} · 执行记录` : '定时任务执行记录'"
    description="查看任务触发来源、执行状态、耗时及关联的 Request ID 与 Trace ID。"
  >
    <FlatResourcePage v-if="jobID" :contract="contract" />
  </Page>
</template>
