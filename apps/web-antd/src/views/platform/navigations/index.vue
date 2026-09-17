<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { navigationTreeContract } from '#/modules/platform/resource-contracts';
import TreeResourcePage from '#/templates/resource/TreeResourcePage.vue';

const route = useRoute();
const applicationID = computed(() => String(route.params.applicationId ?? ''));
const applicationName = computed(() => String(route.query.name ?? ''));
const contract = computed(() => navigationTreeContract(applicationID.value));
</script>

<template>
  <Page
    :title="applicationName ? `${applicationName} · 导航` : '应用导航'"
    description="目录组织层级；菜单绑定页面组件以及 PBAC 资源和动作。"
  >
    <TreeResourcePage v-if="applicationID" :contract="contract" />
  </Page>
</template>
