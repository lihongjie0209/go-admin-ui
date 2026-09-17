<script setup lang="ts">
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import GoSecretRevealModal from '#/components/business/GoSecretRevealModal.vue';
import { serviceAccountPageContract } from '#/modules/identity/resource-contracts';
import {
  createdServiceAccount,
  rotateServiceAccountSecret,
} from '#/modules/identity/service-account-actions';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const page = ref<InstanceType<typeof FlatResourcePage>>();
const secretOpen = ref(false);
const secret = ref('');
const rotateCapability = {
  action: 'rotate-secret',
  key: 'identity.service-account:rotate-secret',
  resource: 'identity.service-account',
};

function revealSecret(value: string) {
  secret.value = value;
  secretOpen.value = true;
}

function updateSecretOpen(value: boolean) {
  secretOpen.value = value;
  if (!value) secret.value = '';
}

const contract = {
  ...serviceAccountPageContract,
  capabilities: [
    ...(serviceAccountPageContract.capabilities ?? []),
    rotateCapability,
  ],
  onSaved: (result: unknown, mode: 'create' | 'edit') => {
    if (mode === 'create') revealSecret(createdServiceAccount(result).secret);
  },
  table: {
    ...serviceAccountPageContract.table,
    rowActions: [
      {
        authorization: rotateCapability,
        confirm: '旧密钥会立即失效，确定生成新密钥吗？',
        deferred: true,
        key: 'rotate-secret',
        label: '轮换密钥',
        run: async (row: Record<string, unknown>) => {
          const result = await rotateServiceAccountSecret(row);
          revealSecret(result.secret);
          await page.value?.reload();
        },
      },
    ],
  },
};
</script>

<template>
  <Page
    title="服务账号"
    description="管理机器身份。密钥只在创建或轮换后展示一次。"
  >
    <FlatResourcePage ref="page" :contract="contract" />
    <GoSecretRevealModal
      :open="secretOpen"
      :secret="secret"
      title="保存服务账号密钥"
      @update:open="updateSecretOpen"
    />
  </Page>
</template>
