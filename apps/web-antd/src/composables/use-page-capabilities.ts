import type { InjectionKey, Ref } from 'vue';

import type { CapabilityRequest } from '#/api/go';

import { computed, inject, onScopeDispose } from 'vue';

export interface PageCapabilityContext {
  allowed: (key: string) => boolean;
  error: Ref<unknown>;
  loading: Ref<boolean>;
  refresh: () => Promise<void>;
  register: (request: CapabilityRequest) => () => void;
}

export const pageCapabilityKey: InjectionKey<PageCapabilityContext> = Symbol(
  'go-page-capabilities',
);

export function usePageCapability(request: CapabilityRequest) {
  const context = inject(pageCapabilityKey, null);
  if (!context) {
    return {
      allowed: computed(() => false),
      error: computed(() => new Error('页面未配置 GoCapabilityProvider')),
      loading: computed(() => false),
      refresh: async () => {},
    };
  }

  const unregister = context.register(request);
  onScopeDispose(unregister);
  return {
    allowed: computed(() => context.allowed(request.key)),
    error: computed(() => context.error.value),
    loading: computed(() => context.loading.value),
    refresh: context.refresh,
  };
}
