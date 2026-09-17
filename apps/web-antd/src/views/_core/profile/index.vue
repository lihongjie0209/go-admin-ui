<script setup lang="ts">
import { Page } from '@vben/common-ui';

import GoAccess from '#/components/foundation/GoAccess.vue';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';

import ProfileContent from './ProfileContent.vue';

const capabilities = [
  {
    action: 'read',
    key: 'identity.profile:read',
    resource: 'identity.profile',
  },
  {
    action: 'update',
    key: 'identity.profile:update',
    resource: 'identity.profile',
  },
  {
    action: 'change-password',
    key: 'identity.credential:change-password',
    resource: 'identity.credential',
  },
  {
    action: 'list',
    key: 'identity.session:list',
    resource: 'identity.session',
  },
];
</script>

<template>
  <Page
    title="个人资料"
    description="维护账号展示信息和联系方式。用户名与账号状态由平台统一管理。"
  >
    <GoCapabilityProvider :capabilities="capabilities">
      <GoAccess action="read" resource="identity.profile">
        <ProfileContent />
      </GoAccess>
    </GoCapabilityProvider>
  </Page>
</template>
