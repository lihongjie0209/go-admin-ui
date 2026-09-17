<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { dictionaryItemPageContract } from '#/modules/platform/resource-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';

const route = useRoute();
const dictionaryID = computed(() => String(route.params.dictionaryId ?? ''));
const dictionaryCode = computed(() => String(route.query.code ?? ''));
const dictionaryName = computed(() =>
  String(route.query.name ?? dictionaryCode.value),
);
const contract = computed(() =>
  dictionaryItemPageContract(dictionaryID.value, dictionaryCode.value),
);
</script>

<template>
  <Page
    :title="dictionaryName ? `${dictionaryName} · 字典项` : '字典项'"
    description="维护静态字典的枚举值或树节点。"
  >
    <FlatResourcePage v-if="dictionaryID" :contract="contract" />
  </Page>
</template>
