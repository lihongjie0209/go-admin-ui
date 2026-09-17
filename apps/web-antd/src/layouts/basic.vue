<script lang="ts" setup>
import type { PersistedTenantContext } from '#/api/go/tenant-context-storage';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';
import { BasicLayout, LockScreen, UserDropdown } from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Button } from 'ant-design-vue';

import { getNavigationApplications, selectApplication } from '#/api/core/menu';
import { getPersistedTenantContext } from '#/api/go/tenant-context-storage';
import GoApplicationSwitcher from '#/components/business/GoApplicationSwitcher.vue';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();
const currentApplicationName = ref('选择应用');
const currentApplicationKey = ref<string>();
const applicationSwitcherOpen = ref(false);
const currentTenant = ref(getPersistedTenantContext());

function syncTenantContext(event: Event) {
  currentTenant.value =
    (event as CustomEvent<PersistedTenantContext>).detail ??
    getPersistedTenantContext();
}

let applicationSyncSequence = 0;
async function syncApplicationFromRoute(path: string) {
  const sequence = ++applicationSyncSequence;
  const key = path.match(/^\/app\/([^/]+)/)?.[1];
  if (!key) {
    currentApplicationName.value = '选择应用';
    currentApplicationKey.value = undefined;
    return;
  }
  const applicationKey = decodeURIComponent(key);
  const applications = await getNavigationApplications();
  if (sequence !== applicationSyncSequence) return;
  const application = applications.find((item) => item.key === applicationKey);
  currentApplicationName.value = application?.name ?? '未知应用';
  currentApplicationKey.value = application?.key;
  if (application) await selectApplication(application.key);
}

onMounted(() => {
  window.addEventListener('go-admin:tenant-context-changed', syncTenantContext);
  void syncApplicationFromRoute(route.path);
});
onBeforeUnmount(() => {
  window.removeEventListener(
    'go-admin:tenant-context-changed',
    syncTenantContext,
  );
});
watch(
  () => route.path,
  (path) => void syncApplicationFromRoute(path),
);

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'TenantSelector' });
    },
    icon: 'lucide:building-2',
    text: '切换租户',
  },
  {
    handler: () => {
      applicationSwitcherOpen.value = true;
    },
    icon: 'lucide:panels-top-left',
    text: '切换应用',
  },
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (enable) {
      const watermarkColor = isDarkValue
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)';

      await updateWatermark({
        advancedStyle: {
          colorStops: [
            {
              color: watermarkColor,
              offset: 0,
            },
            {
              color: watermarkColor,
              offset: 1,
            },
          ],
          type: 'linear',
        },
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout
    :avatar
    :text="userStore.userInfo?.realName"
    @clear-preferences-and-logout="handleLogout"
    @logout="handleLogout"
  >
    <template #sidebar-header>
      <div class="mx-2 mb-1 border-b border-border/60 px-2 py-2">
        <button
          v-if="currentTenant"
          class="flex h-7 w-full items-center gap-2 rounded px-1 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          type="button"
          @click="router.push({ name: 'TenantSelector' })"
        >
          <IconifyIcon icon="lucide:building-2" class="size-3.5 shrink-0" />
          <span v-if="!preferences.sidebar.collapsed" class="truncate">
            {{ currentTenant.tenant_name }}
          </span>
        </button>
        <div v-if="currentApplicationKey" class="flex h-8 items-center gap-2">
          <span
            v-if="!preferences.sidebar.collapsed"
            class="min-w-0 flex-1 truncate text-sm font-semibold"
          >
            {{ currentApplicationName }}
          </span>
          <Button
            :aria-label="`切换应用，当前为${currentApplicationName}`"
            class="shrink-0"
            size="small"
            type="text"
            @click="applicationSwitcherOpen = true"
          >
            <IconifyIcon icon="lucide:chevrons-up-down" class="size-4" />
          </Button>
        </div>
      </div>
    </template>
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        :description="userStore.userInfo?.email || userStore.userInfo?.username"
        @clear-preferences-and-logout="handleLogout"
        @logout="handleLogout"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
  <GoApplicationSwitcher
    v-model:open="applicationSwitcherOpen"
    :current-application-key="currentApplicationKey"
  />
</template>
