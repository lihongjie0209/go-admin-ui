<script setup lang="ts">
import type { NavigationApplication } from '#/api/core/menu';

import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { useAccessStore, useTabbarStore } from '@vben/stores';

import {
  Alert,
  Button,
  Empty,
  Input,
  message,
  Modal,
  Pagination,
  Spin,
  Tag,
} from 'ant-design-vue';

import {
  getApplicationHomePath,
  getMyMenuUsage,
  getNavigationApplications,
  selectApplication,
} from '#/api/core/menu';
import { errorMessage } from '#/components/foundation/error-presentation';
import { usePageCapability } from '#/composables/use-page-capabilities';
import {
  applicationListCapability,
  applicationReadCapability,
  applicationSwitchCapability,
  currentNavigationReadCapability,
} from '#/modules/platform/application-selection-capabilities';
import { resetRoutes, router } from '#/router';

const props = defineProps<{ currentApplicationKey?: string }>();
const open = defineModel<boolean>('open', { default: false });
const applications = ref<NavigationApplication[]>([]);
const keyword = ref('');
const loading = ref(false);
const loadError = ref<unknown>();
const switching = ref(false);
const applicationUsage = ref<Record<string, { clicks: number; last: string }>>(
  {},
);
const currentPage = ref(1);
const pageSize = 8;
const route = useRoute();
const tabbarStore = useTabbarStore();
const accessStore = useAccessStore();
const listCapability = usePageCapability(applicationListCapability);
const readCapability = usePageCapability(applicationReadCapability);
const switchCapability = usePageCapability(applicationSwitchCapability);
const navigationCapability = usePageCapability(currentNavigationReadCapability);
const canSwitch = computed(
  () =>
    readCapability.allowed.value &&
    switchCapability.allowed.value &&
    navigationCapability.allowed.value,
);
let applicationLoadGeneration = 0;
let usageLoadGeneration = 0;
let switchGeneration = 0;

const filtered = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase('zh-CN');
  return applications.value
    .filter(
      (application) =>
        !search ||
        [application.name, application.key, application.description].some(
          (value) =>
            String(value ?? '')
              .toLocaleLowerCase('zh-CN')
              .includes(search),
        ),
    )
    .toSorted((left, right) => {
      const leftUsage = applicationUsage.value[left.id] ?? {
        clicks: 0,
        last: '',
      };
      const rightUsage = applicationUsage.value[right.id] ?? {
        clicks: 0,
        last: '',
      };
      return (
        rightUsage.clicks - leftUsage.clicks ||
        rightUsage.last.localeCompare(leftUsage.last)
      );
    });
});
const paginated = computed(() => {
  const offset = (currentPage.value - 1) * pageSize;
  return filtered.value.slice(offset, offset + pageSize);
});

async function switchTo(application: NavigationApplication) {
  if (switching.value) return;
  if (application.key === props.currentApplicationKey) {
    open.value = false;
    return;
  }
  const current = ++switchGeneration;
  switching.value = true;
  try {
    if (current !== switchGeneration) return;
    if (props.currentApplicationKey) {
      sessionStorage.setItem(
        `go-admin.application-tabs:${props.currentApplicationKey}`,
        JSON.stringify({ lastPath: route.fullPath, tabs: tabbarStore.tabs }),
      );
    }
    const stateKey = `go-admin.application-tabs:${application.key}`;
    let targetState: null | {
      lastPath?: string;
      tabs?: typeof tabbarStore.tabs;
    } = null;
    try {
      targetState = JSON.parse(sessionStorage.getItem(stateKey) ?? 'null');
    } catch {
      sessionStorage.removeItem(stateKey);
    }
    const prefix = `/app/${application.key}/`;
    await selectApplication(application.key);
    if (current !== switchGeneration) return;
    const target = targetState?.lastPath?.startsWith(prefix)
      ? targetState.lastPath
      : getApplicationHomePath(application);
    tabbarStore.$reset();
    tabbarStore.tabs = (targetState?.tabs ?? []).filter((tab) =>
      tab.path.startsWith(prefix),
    );
    open.value = false;
    resetRoutes();
    accessStore.setAccessMenus([]);
    accessStore.setAccessRoutes([]);
    accessStore.setIsAccessChecked(false);
    await router.replace(target);
  } catch (error) {
    if (current === switchGeneration)
      message.error(error instanceof Error ? error.message : '应用切换失败');
  } finally {
    if (current === switchGeneration) switching.value = false;
  }
}

watch(keyword, () => {
  currentPage.value = 1;
});
async function loadApplications() {
  const current = ++applicationLoadGeneration;
  loading.value = true;
  loadError.value = undefined;
  try {
    const result = await getNavigationApplications();
    if (current !== applicationLoadGeneration) return;
    applications.value = result;
  } catch (error) {
    if (current === applicationLoadGeneration) {
      applications.value = [];
      loadError.value = error;
    }
  } finally {
    if (current === applicationLoadGeneration) loading.value = false;
  }
}

async function loadUsage() {
  const current = ++usageLoadGeneration;
  try {
    const usage = await getMyMenuUsage();
    if (current !== usageLoadGeneration) return;
    const nextUsage: Record<string, { clicks: number; last: string }> = {};
    for (const item of usage) {
      const aggregate = nextUsage[item.application_id] ?? {
        clicks: 0,
        last: '',
      };
      aggregate.clicks += Number(item.click_count);
      if (item.last_clicked_at > aggregate.last)
        aggregate.last = item.last_clicked_at;
      nextUsage[item.application_id] = aggregate;
    }
    applicationUsage.value = nextUsage;
  } catch {
    if (current === usageLoadGeneration) applicationUsage.value = {};
  }
}

watch(
  [open, () => listCapability.allowed.value],
  ([visible, allowed]) => {
    if (!visible || !allowed) return;
    keyword.value = '';
    currentPage.value = 1;
    void loadApplications();
  },
  { immediate: true },
);
watch(
  [open, () => navigationCapability.allowed.value],
  ([visible, allowed]) => {
    if (visible && allowed) void loadUsage();
  },
  { immediate: true },
);
watch(open, (visible) => {
  if (visible) return;
  applicationLoadGeneration++;
  usageLoadGeneration++;
  loading.value = false;
  loadError.value = undefined;
  applications.value = [];
  applicationUsage.value = {};
});
function deactivate() {
  applicationLoadGeneration++;
  usageLoadGeneration++;
  switchGeneration++;
  loading.value = false;
  switching.value = false;
  applications.value = [];
  applicationUsage.value = {};
  open.value = false;
}
onDeactivated(deactivate);
onBeforeUnmount(() => {
  applicationLoadGeneration++;
  usageLoadGeneration++;
  switchGeneration++;
});
</script>

<template>
  <Modal v-model:open="open" :footer="null" title="切换应用" :width="760">
    <Input.Search
      v-model:value="keyword"
      allow-clear
      class="mb-4"
      placeholder="搜索应用名称或标识"
    />
    <Alert
      v-if="loadError"
      class="mb-4"
      :description="errorMessage(loadError, '应用列表加载失败')"
      message="应用列表加载失败"
      show-icon
      type="error"
    >
      <template #action>
        <Button size="small" @click="loadApplications">重试</Button>
      </template>
    </Alert>
    <Alert
      v-else-if="listCapability.error.value"
      class="mb-4"
      :description="
        errorMessage(listCapability.error.value, '权限状态加载失败')
      "
      message="权限状态加载失败"
      show-icon
      type="error"
    />
    <Alert
      v-else-if="!listCapability.loading.value && !canSwitch"
      class="mb-4"
      message="当前账号没有完整的应用切换权限"
      show-icon
      type="warning"
    />
    <Spin :spinning="loading || listCapability.loading.value">
      <div v-if="paginated.length && canSwitch" class="grid grid-cols-2 gap-3">
        <button
          v-for="application in paginated"
          :key="application.key"
          class="flex min-h-20 items-center gap-3 rounded-md border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
          :class="{
            'border-primary bg-primary/5':
              application.key === currentApplicationKey,
          }"
          type="button"
          :disabled="switching"
          @click="switchTo(application)"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
          >
            <IconifyIcon
              :icon="application.icon || 'lucide:app-window'"
              class="size-5"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-2 font-medium">
              <span class="truncate">{{ application.name }}</span>
              <Tag
                :color="application.type === 'platform' ? 'blue' : 'green'"
                >{{
                  application.type === 'platform' ? '平台级' : '组织级'
                }}</Tag
              >
              <Tag v-if="application.key === currentApplicationKey" color="blue"
                >当前</Tag
              >
            </span>
            <span class="mt-1 block truncate text-xs text-muted-foreground">{{
              application.description
            }}</span>
          </span>
        </button>
      </div>
      <Empty v-else-if="!loading && canSwitch" description="没有匹配的应用" />
    </Spin>
    <div v-if="filtered.length > pageSize" class="mt-4 flex justify-end">
      <Pagination
        v-model:current="currentPage"
        :page-size="pageSize"
        :show-size-changer="false"
        :total="filtered.length"
        size="small"
      />
    </div>
  </Modal>
</template>
