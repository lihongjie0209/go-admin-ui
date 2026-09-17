<script setup lang="ts">
import type { NavigationApplication, NavigationMenu } from '#/api/core/menu';

import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import { useAccessStore, useTabbarStore } from '@vben/stores';

import {
  Empty,
  Input,
  message,
  Modal,
  Pagination,
  Spin,
  Tag,
} from 'ant-design-vue';

import {
  getMyMenuUsage,
  getNavigationApplications,
  selectApplication,
} from '#/api/core/menu';
import { resetRoutes, router } from '#/router';

const props = defineProps<{ currentApplicationKey?: string }>();
const open = defineModel<boolean>('open', { default: false });
const applications = ref<NavigationApplication[]>([]);
const keyword = ref('');
const loading = ref(false);
const switching = ref(false);
const applicationUsage = ref<Record<string, { clicks: number; last: string }>>(
  {},
);
const currentPage = ref(1);
const pageSize = 8;
const route = useRoute();
const tabbarStore = useTabbarStore();
const accessStore = useAccessStore();
let loadGeneration = 0;
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

function firstMenuPath(application: NavigationApplication) {
  const menus = application.menus;
  const menuMap = new Map(menus.map((menu) => [menu.id, menu]));
  const page = menus
    .toSorted((left, right) => left.sort_order - right.sort_order)
    .find((menu) => menu.component);
  if (!page) return '/apps';
  const segments: string[] = [];
  let menu: NavigationMenu | undefined = page;
  while (menu) {
    segments.unshift(
      String(menu.route_path ?? menu.key)
        .split('/')
        .findLast(Boolean) ?? menu.key,
    );
    menu = menu.parent_id ? menuMap.get(menu.parent_id) : undefined;
  }
  return `/app/${application.key}/${segments.join('/')}`;
}

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
      : firstMenuPath(application);
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
watch(
  open,
  async (visible) => {
    const current = ++loadGeneration;
    if (!visible) return;
    keyword.value = '';
    currentPage.value = 1;
    loading.value = true;
    try {
      const [navigation, usage] = await Promise.all([
        getNavigationApplications(),
        getMyMenuUsage(),
      ]);
      if (current !== loadGeneration) return;
      applications.value = navigation;
      const nextUsage: Record<string, { clicks: number; last: string }> = {};
      for (const item of usage) {
        const current = nextUsage[item.application_id] ?? {
          clicks: 0,
          last: '',
        };
        current.clicks += Number(item.click_count);
        if (item.last_clicked_at > current.last)
          current.last = item.last_clicked_at;
        nextUsage[item.application_id] = current;
      }
      applicationUsage.value = nextUsage;
    } catch (error) {
      if (current === loadGeneration) {
        applications.value = [];
        applicationUsage.value = {};
        message.error(
          error instanceof Error ? error.message : '应用列表加载失败',
        );
      }
    } finally {
      if (current === loadGeneration) loading.value = false;
    }
  },
  { immediate: true },
);
function deactivate() {
  loadGeneration++;
  switchGeneration++;
  loading.value = false;
  switching.value = false;
  applications.value = [];
  applicationUsage.value = {};
  open.value = false;
}
onDeactivated(deactivate);
onBeforeUnmount(() => {
  loadGeneration++;
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
    <Spin :spinning="loading">
      <div v-if="paginated.length" class="grid grid-cols-2 gap-3">
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
      <Empty v-else-if="!loading" description="没有匹配的应用" />
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
