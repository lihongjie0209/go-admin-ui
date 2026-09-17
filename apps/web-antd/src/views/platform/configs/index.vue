<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { platformConfigPageContract } from '#/modules/platform/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';
</script>

<template>
  <Page title="平台配置" description="维护平台运行参数及匿名可读范围。">
    <FlatResourcePage :contract="platformConfigPageContract" />
  </Page>
</template>
