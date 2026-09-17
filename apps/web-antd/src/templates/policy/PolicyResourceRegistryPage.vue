<script setup lang="ts">
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';

import PolicyResourceRegistryWorkspace from './PolicyResourceRegistryWorkspace.vue';

const capabilities = [
  {
    action: 'list',
    key: 'pbac.resource-action:list',
    resource: 'pbac.resource-action',
  },
];
</script>

<template>
  <GoCapabilityProvider :capabilities="capabilities">
    <PolicyResourceRegistryWorkspace />
  </GoCapabilityProvider>
</template>
