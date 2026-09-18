<script setup lang="ts">
import type { AvailableTenantContext } from '#/api/go';

import { computed, onScopeDispose, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useAccessStore, useTabbarStore } from '@vben/stores';

import { Button, Empty, Input, message, Spin, Tag } from 'ant-design-vue';

import {
  getAvailableTenantContexts,
  getPersistedTenantContext,
  switchTenantContext,
} from '#/api/go';
import { errorMessage } from '#/components/foundation/error-presentation';
import GoAccess from '#/components/foundation/GoAccess.vue';
import GoAuthorizedLoader from '#/components/foundation/GoAuthorizedLoader.vue';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';
import { resetRoutes } from '#/router';
import { clearPrincipalScopedState } from '#/security/principal-state';

const accessStore = useAccessStore();
const tabbarStore = useTabbarStore();
const router = useRouter();
const tenants = ref<AvailableTenantContext[]>([]);
const keyword = ref('');
const loading = ref(true);
const switchingID = ref('');
const loadError = ref<unknown>();
const currentTenantID = ref(getPersistedTenantContext()?.tenant_id ?? '');
const controller = new AbortController();
const listCapability = {
  action: 'list',
  key: 'tenant.selection:list',
  resource: 'tenant.selection',
};
const switchCapability = {
  action: 'switch',
  key: 'tenant.selection:switch',
  resource: 'tenant.selection',
};

const visibleTenants = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase('zh-CN');
  if (!query) return tenants.value;
  return tenants.value.filter((tenant) =>
    [tenant.tenant_name, tenant.tenant_code].some((value) =>
      value.toLocaleLowerCase('zh-CN').includes(query),
    ),
  );
});

async function load() {
  loading.value = true;
  loadError.value = undefined;
  try {
    tenants.value = await getAvailableTenantContexts(controller.signal);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      loadError.value = error;
    }
  } finally {
    loading.value = false;
  }
}

async function selectTenant(tenant: AvailableTenantContext) {
  if (switchingID.value) return;
  switchingID.value = tenant.tenant_id;
  try {
    const result = await switchTenantContext(tenant.tenant_id);
    accessStore.setAccessToken(result.access_token);
    currentTenantID.value = tenant.tenant_id;
    clearPrincipalScopedState();
    tabbarStore.$reset();
    resetRoutes();
    accessStore.setAccessCodes([]);
    accessStore.setAccessMenus([]);
    accessStore.setAccessRoutes([]);
    accessStore.setIsAccessChecked(false);
    await router.replace('/apps');
    message.success(`已切换到${tenant.tenant_name}`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '租户切换失败');
  } finally {
    switchingID.value = '';
  }
}

onScopeDispose(() => controller.abort());
</script>

<template>
  <Page>
    <GoCapabilityProvider :capabilities="[listCapability, switchCapability]">
      <GoAuthorizedLoader :authorization="listCapability" :load="load" />
      <GoAccess
        action="list"
        denied="message"
        denied-message="当前账号无权查看可用租户"
        resource="tenant.selection"
      >
        <main
          class="mx-auto flex min-h-[calc(100vh-96px)] max-w-5xl flex-col px-6 py-10"
        >
          <header
            class="flex flex-wrap items-end justify-between gap-4 border-b pb-6"
          >
            <div>
              <h1 class="m-0 text-2xl font-semibold text-foreground">
                选择工作租户
              </h1>
              <p class="mb-0 mt-2 text-sm text-muted-foreground">
                数据、权限和应用范围会随租户切换，切换后将清空当前应用标签。
              </p>
            </div>
            <Input.Search
              v-model:value="keyword"
              allow-clear
              class="w-72"
              placeholder="搜索租户名称或编码"
            />
          </header>

          <Spin :spinning="loading" class="mt-6 min-h-52">
            <div
              v-if="loadError"
              class="flex min-h-52 flex-col items-center justify-center gap-3"
            >
              <p class="m-0 text-sm font-medium text-destructive">
                租户列表加载失败
              </p>
              <p class="m-0 max-w-xl text-center text-xs text-muted-foreground">
                {{ errorMessage(loadError, '租户列表加载失败') }}
              </p>
              <Button @click="load">重新加载</Button>
            </div>
            <div
              v-else-if="visibleTenants.length"
              class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <GoAccess
                v-for="tenant in visibleTenants"
                :key="tenant.tenant_id"
                action="switch"
                resource="tenant.selection"
              >
                <button
                  class="group flex min-h-28 items-start gap-4 rounded-md border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :disabled="Boolean(switchingID)"
                  type="button"
                  @click="selectTenant(tenant)"
                >
                  <span
                    class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                  >
                    <IconifyIcon icon="lucide:building-2" class="size-5" />
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="flex items-center gap-2">
                      <strong class="truncate text-sm">{{
                        tenant.tenant_name
                      }}</strong>
                      <Tag
                        v-if="tenant.tenant_id === currentTenantID"
                        color="blue"
                        >当前</Tag
                      >
                      <Tag v-if="tenant.is_administrator" color="gold"
                        >管理员</Tag
                      >
                    </span>
                    <span
                      class="mt-2 block truncate text-xs text-muted-foreground"
                    >
                      {{ tenant.tenant_code }}
                    </span>
                    <span
                      v-if="switchingID === tenant.tenant_id"
                      class="mt-2 block text-xs text-primary"
                    >
                      正在切换…
                    </span>
                  </span>
                </button>
              </GoAccess>
            </div>
            <Empty
              v-else-if="!loading"
              description="当前账号尚未加入可用租户"
            />
          </Spin>
        </main>
      </GoAccess>
    </GoCapabilityProvider>
  </Page>
</template>
