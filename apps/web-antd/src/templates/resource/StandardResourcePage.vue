<script setup lang="ts">
import FlatResourcePage from './FlatResourcePage.vue';
import { standardResourceTemplate as template } from './standard-resource';

const contract = {
  authorizationResource: template.authorizationResource,
  capabilities: template.capabilities,
  detailFields: template.detailFields,
  editorFields: template.fields,
  queryFields: template.queryFields,
  table: {
    columns: template.columns,
    defaultSort: template.sort,
    endpoints: template.endpoints,
  },
};
</script>

<template>
  <FlatResourcePage :contract="contract" />
</template>
