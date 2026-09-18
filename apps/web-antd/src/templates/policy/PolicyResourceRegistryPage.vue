<script setup lang="ts">
import GoAccess from '#/components/foundation/GoAccess.vue';
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
    <GoAccess
      action="list"
      denied="message"
      denied-message="当前账号无权查看资源与动作注册表"
      resource="pbac.resource-action"
    >
      <PolicyResourceRegistryWorkspace />
    </GoAccess>
  </GoCapabilityProvider>
</template>
