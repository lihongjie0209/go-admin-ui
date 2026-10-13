<script setup lang="ts">
import type { CapabilityRequest } from '#/api/go';

import { onScopeDispose, provide, ref, watch } from 'vue';

import { evaluateCapabilities } from '#/api/go';
import { capabilityRefreshDelay } from '#/composables/capability-refresh';
import { pageCapabilityKey } from '#/composables/use-page-capabilities';

const props = withDefaults(
  defineProps<{
    capabilities?: CapabilityRequest[];
  }>(),
  {
    capabilities: () => [],
  },
);

const decisions = ref<Record<string, boolean>>({});
const dynamic = new Map<
  string,
  { count: number; request: CapabilityRequest }
>();
const registrationConflicts = new Map<string, number>();
const evaluationError = ref<unknown>();
const loading = ref(false);
let generation = 0;
let refreshQueued = false;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleRefresh(expiresAt?: string) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(
    () => void refresh(),
    capabilityRefreshDelay(expiresAt),
  );
}

function declarations() {
  const conflictedKey = registrationConflicts.keys().next().value;
  if (conflictedKey) {
    throw new Error(
      `页面能力标识 ${conflictedKey} 被注册为不同的 Resource/Action`,
    );
  }
  const byKey = new Map<string, CapabilityRequest>();
  for (const request of [
    ...props.capabilities,
    ...[...dynamic.values()].map((item) => item.request),
  ]) {
    const current = byKey.get(request.key);
    if (
      current &&
      (current.resource !== request.resource ||
        current.action !== request.action)
    ) {
      throw new Error(
        `页面能力标识 ${request.key} 被注册为不同的 Resource/Action`,
      );
    }
    byKey.set(request.key, request);
  }
  return [...byKey.values()];
}

async function refresh() {
  const current = ++generation;
  if (refreshTimer) clearTimeout(refreshTimer);
  evaluationError.value = undefined;
  decisions.value = {};

  let requests: CapabilityRequest[];
  try {
    requests = declarations();
    if (requests.length > 100)
      throw new Error('单个页面最多声明 100 个操作能力');
  } catch (error) {
    evaluationError.value = error;
    return;
  }
  if (requests.length === 0) return;

  loading.value = true;
  try {
    const result = await evaluateCapabilities(requests);
    if (current !== generation) return;
    for (const item of result.items)
      decisions.value[item.key] = item.allowed === true;
    scheduleRefresh(result.expires_at);
  } catch (error) {
    if (current === generation) {
      evaluationError.value = error;
      scheduleRefresh();
    }
  } finally {
    if (current === generation) loading.value = false;
  }
}

function queueRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  queueMicrotask(() => {
    refreshQueued = false;
    void refresh();
  });
}

function register(request: CapabilityRequest) {
  const declared = props.capabilities.find((item) => item.key === request.key);
  if (declared) {
    if (
      declared.resource === request.resource &&
      declared.action === request.action
    ) {
      return () => {};
    }
    registrationConflicts.set(
      request.key,
      (registrationConflicts.get(request.key) ?? 0) + 1,
    );
    queueRefresh();
    return () => {
      const count = registrationConflicts.get(request.key) ?? 0;
      if (count <= 1) registrationConflicts.delete(request.key);
      else registrationConflicts.set(request.key, count - 1);
      queueRefresh();
    };
  }
  const current = dynamic.get(request.key);
  if (
    current &&
    (current.request.resource !== request.resource ||
      current.request.action !== request.action)
  ) {
    registrationConflicts.set(
      request.key,
      (registrationConflicts.get(request.key) ?? 0) + 1,
    );
    queueRefresh();
    return () => {
      const count = registrationConflicts.get(request.key) ?? 0;
      if (count <= 1) registrationConflicts.delete(request.key);
      else registrationConflicts.set(request.key, count - 1);
      queueRefresh();
    };
  }
  dynamic.set(request.key, { count: (current?.count ?? 0) + 1, request });
  queueRefresh();
  return () => {
    const registered = dynamic.get(request.key);
    if (!registered) return;
    if (registered.count === 1) dynamic.delete(request.key);
    else registered.count--;
    queueRefresh();
  };
}

provide(pageCapabilityKey, {
  allowed: (key) => decisions.value[key] === true,
  error: evaluationError,
  loading,
  refresh,
  register,
});

watch(() => props.capabilities, queueRefresh, { deep: true, immediate: true });
if (typeof window !== 'undefined') {
  window.addEventListener('focus', queueRefresh);
  window.addEventListener('go:principal-context-changed', queueRefresh);
}
onScopeDispose(() => {
  generation++;
  if (refreshTimer) clearTimeout(refreshTimer);
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', queueRefresh);
    window.removeEventListener('go:principal-context-changed', queueRefresh);
  }
});
</script>

<template>
  <slot :error="evaluationError" :loading="loading" :refresh="refresh"></slot>
</template>
