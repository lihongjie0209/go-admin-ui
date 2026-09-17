<script setup lang="ts">
import type { CapabilityRequest } from '#/api/go';
import type { PolicyLifecycleKind } from '#/modules/policy/lifecycle-api';

import { computed } from 'vue';

import { Page } from '@vben/common-ui';

import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';
import { policyAuthorizationResource } from '#/modules/policy/lifecycle-api';

import PolicyLifecycleWorkspace from './PolicyLifecycleWorkspace.vue';

const props = defineProps<{
  description: string;
  kind: PolicyLifecycleKind;
  title: string;
}>();

const capabilities = computed<CapabilityRequest[]>(() => {
  const resource = policyAuthorizationResource(props.kind);
  return [
    'create',
    'read',
    'list',
    'create-version',
    'simulate',
    'publish',
    'set-status',
  ].map((action) => ({
    action,
    key: `${resource}:${action}`,
    resource,
  }));
});
</script>

<template>
  <Page :description="description" :title="title">
    <GoCapabilityProvider :capabilities="capabilities">
      <PolicyLifecycleWorkspace :kind="kind" />
    </GoCapabilityProvider>
  </Page>
</template>
