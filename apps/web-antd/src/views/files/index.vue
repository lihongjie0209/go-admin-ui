<script setup lang="ts">
import type { FlatResourcePageContract } from '#/templates/resource/resource-page-contract';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import GoFileUploadButton from '#/components/business/GoFileUploadButton.vue';
import {
  openFileDownload,
  requestFileDownload,
} from '#/modules/files/file-actions';
import { filePageContract } from '#/modules/files/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const page = ref<InstanceType<typeof FlatResourcePage>>();
const downloadCapability = {
  action: 'download',
  key: 'file.object:download',
  resource: 'file.object',
};
const contract: FlatResourcePageContract = {
  ...filePageContract,
  table: {
    ...filePageContract.table,
    rowActions: [
      {
        authorization: downloadCapability,
        key: 'download',
        label: '下载',
        run: async (row: Record<string, unknown>) => {
          openFileDownload(await requestFileDownload(String(row.id)));
        },
        successMessage: false,
      },
    ],
  },
};
</script>

<template>
  <Page title="文件管理" description="统一管理当前租户可访问的文件及其元数据。">
    <FlatResourcePage ref="page" :contract="contract">
      <template #toolbar>
        <div class="mb-4 flex justify-end">
          <GoFileUploadButton @uploaded="page?.reload({ resetPage: true })" />
        </div>
      </template>
    </FlatResourcePage>
  </Page>
</template>
