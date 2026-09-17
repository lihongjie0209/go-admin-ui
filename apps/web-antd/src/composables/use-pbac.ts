import type { MaybeRefOrGetter } from 'vue';

import type { CapabilityRequest } from '#/api/go';

import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

import { evaluateCapabilities, evaluateRowCapabilities } from '#/api/go';

export function useCapability(request: MaybeRefOrGetter<CapabilityRequest>) {
  const allowed = ref(false);
  const requestError = ref<unknown>();
  const loading = ref(true);
  let generation = 0;

  async function refresh() {
    const current = ++generation;
    allowed.value = false;
    requestError.value = undefined;
    loading.value = true;
    try {
      const item = toValue(request);
      const result = await evaluateCapabilities([item]);
      if (current === generation)
        allowed.value = result.items[0]?.allowed === true;
    } catch (error) {
      if (current === generation) requestError.value = error;
    } finally {
      if (current === generation) loading.value = false;
    }
  }

  watch(() => toValue(request), refresh, { deep: true, immediate: true });
  onScopeDispose(() => {
    generation++;
  });
  return {
    allowed: computed(() => allowed.value),
    error: requestError,
    loading,
    refresh,
  };
}

export function useRowCapabilities(
  resource: MaybeRefOrGetter<string>,
  actions: MaybeRefOrGetter<string[]>,
  resourceIds: MaybeRefOrGetter<string[]>,
) {
  const decisions = ref<Record<string, Record<string, boolean>>>({});
  const requestError = ref<unknown>();
  const loading = ref(false);
  let generation = 0;

  async function refresh() {
    const current = ++generation;
    decisions.value = {};
    requestError.value = undefined;
    const ids = [...new Set(toValue(resourceIds))];
    if (ids.length === 0) return;
    loading.value = true;
    try {
      const result = await evaluateRowCapabilities(
        toValue(resource),
        [...new Set(toValue(actions))],
        ids,
      );
      if (current === generation) {
        decisions.value = Object.fromEntries(
          result.items.map((item) => [item.resource_id, item.actions]),
        );
      }
    } catch (error) {
      if (current === generation) requestError.value = error;
    } finally {
      if (current === generation) loading.value = false;
    }
  }

  watch(
    [
      () => toValue(resource),
      () => toValue(actions),
      () => toValue(resourceIds),
    ],
    refresh,
    { deep: true, immediate: true },
  );
  onScopeDispose(() => {
    generation++;
  });
  return {
    allowed: (resourceId: string, action: string) =>
      decisions.value[resourceId]?.[action] === true,
    decisions,
    error: requestError,
    loading,
    refresh,
  };
}
