import type { MaybeRefOrGetter } from 'vue';

import type { CapabilityRequest } from '#/api/go';

import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

import { evaluateCapabilities, evaluateRowCapabilities } from '#/api/go';

import { capabilityRefreshDelay } from './capability-refresh';

export function useCapability(request: MaybeRefOrGetter<CapabilityRequest>) {
  const allowed = ref(false);
  const requestError = ref<unknown>();
  const loading = ref(true);
  let generation = 0;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;

  function schedule(expiresAt?: string) {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(
      () => void refresh(),
      capabilityRefreshDelay(expiresAt),
    );
  }

  async function refresh() {
    const current = ++generation;
    if (refreshTimer) clearTimeout(refreshTimer);
    allowed.value = false;
    requestError.value = undefined;
    loading.value = true;
    try {
      const item = toValue(request);
      const result = await evaluateCapabilities([item]);
      if (current === generation) {
        allowed.value = result.items[0]?.allowed === true;
        schedule(result.expires_at);
      }
    } catch (error) {
      if (current === generation) {
        requestError.value = error;
        schedule();
      }
    } finally {
      if (current === generation) loading.value = false;
    }
  }

  watch(() => toValue(request), refresh, { deep: true, immediate: true });
  if (typeof window !== 'undefined') {
    window.addEventListener('go:principal-context-changed', refresh);
    window.addEventListener('focus', refresh);
  }
  onScopeDispose(() => {
    generation++;
    if (refreshTimer) clearTimeout(refreshTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('go:principal-context-changed', refresh);
      window.removeEventListener('focus', refresh);
    }
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
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;

  function schedule(expiresAt?: string) {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(
      () => void refresh(),
      capabilityRefreshDelay(expiresAt),
    );
  }

  async function refresh() {
    const current = ++generation;
    if (refreshTimer) clearTimeout(refreshTimer);
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
        schedule(result.expires_at);
      }
    } catch (error) {
      if (current === generation) {
        requestError.value = error;
        schedule();
      }
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
  if (typeof window !== 'undefined') {
    window.addEventListener('go:principal-context-changed', refresh);
    window.addEventListener('focus', refresh);
  }
  onScopeDispose(() => {
    generation++;
    if (refreshTimer) clearTimeout(refreshTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('go:principal-context-changed', refresh);
      window.removeEventListener('focus', refresh);
    }
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
