<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Fallback } from '@vben/common-ui';

import { getApplicationHomePath, getCurrentApplication } from '#/api/core/menu';

defineOptions({ name: 'Fallback404Demo' });

const homePath = ref('/apps');
onMounted(async () => {
  try {
    const application = await getCurrentApplication();
    homePath.value = application
      ? getApplicationHomePath(application)
      : '/apps';
  } catch {
    // A missing application-read grant must not break the error page itself.
    homePath.value = '/apps';
  }
});
</script>

<template>
  <Fallback status="404" :home-path="homePath" />
</template>
