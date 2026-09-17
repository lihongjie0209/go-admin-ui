<script setup lang="ts">
import type { CapabilityRequest } from '#/api/go';

import { watch } from 'vue';

import { usePageCapability } from '#/composables/use-page-capabilities';

const props = defineProps<{
  authorization: CapabilityRequest;
  load: () => Promise<unknown> | unknown;
}>();

const capability = usePageCapability(props.authorization);

watch(
  () => capability.allowed.value,
  (allowed) => {
    if (allowed) void props.load();
  },
  { immediate: true },
);
</script>
