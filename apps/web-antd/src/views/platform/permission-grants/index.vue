<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { platformPermissionGrantContract } from '#/modules/platform/authorization-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';
</script>

<template>
  <Page
    title="平台主体授权"
    description="将平台权限授予用户或服务账号；撤销后立即以服务端授权结果为准。"
  >
    <FlatResourcePage :contract="platformPermissionGrantContract" />
  </Page>
</template>
