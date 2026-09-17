<script setup lang="ts">
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { dictionaryPageContract } from '#/modules/platform/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const router = useRouter();
const itemListCapability = {
  action: 'list',
  key: 'dictionary.item:list',
  resource: 'dictionary.item',
};
const contract = {
  ...dictionaryPageContract,
  capabilities: [
    ...(dictionaryPageContract.capabilities ?? []),
    itemListCapability,
  ],
  table: {
    ...dictionaryPageContract.table,
    rowActions: [
      {
        authorization: itemListCapability,
        deferred: true,
        key: 'items',
        label: '维护字典项',
        run: async (row: Record<string, unknown>) => {
          await router.push({
            name: 'PlatformDictionaryItems',
            params: { dictionaryId: String(row.id) },
            query: { code: String(row.code), name: String(row.name) },
          });
        },
        visible: (row: Record<string, unknown>) => row.source === 'static',
      },
    ],
  },
};
</script>

<template>
  <Page title="数据字典" description="维护静态字典定义与代码提供者入口。">
    <FlatResourcePage :contract="contract" />
  </Page>
</template>
