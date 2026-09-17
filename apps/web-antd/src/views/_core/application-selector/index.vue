<script setup lang="ts">
import type { NavigationApplication } from '#/api/core/menu';

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { useAccessStore, useTabbarStore } from '@vben/stores';

import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
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
import GoAccess from '#/components/foundation/GoAccess.vue';
import GoAuthorizedLoader from '#/components/foundation/GoAuthorizedLoader.vue';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';
import { resetRoutes } from '#/router';

const applications = ref<NavigationApplication[]>([]);
const loading = ref(true);
const loadError = ref<unknown>();
const keyword = ref('');
const currentPage = ref(1);
const pageSize = 12;
const route = useRoute();
const router = useRouter();
const tabbarStore = useTabbarStore();
const accessStore = useAccessStore();
const menuUsage = ref<
  Record<string, { clickCount: number; lastClickedAt: string }>
>({});
const applicationUsage = ref<Record<string, { clicks: number; last: string }>>(
  {},
);
const listCapability = {
  action: 'list',
  key: 'application.current:list',
  resource: 'application.current',
};
const navigationCapability = {
  action: 'read',
  key: 'navigation.current:read',
  resource: 'navigation.current',
};
const capabilities = [
  listCapability,
  {
    action: 'read',
    key: 'application.current:read',
    resource: 'application.current',
  },
  {
    action: 'switch',
    key: 'application.current:switch',
    resource: 'application.current',
  },
  navigationCapability,
];

interface ApplicationTabState {
  lastPath?: string;
  tabs?: typeof tabbarStore.tabs;
}

function tabStateKey(applicationKey: string) {
  return `go-admin.application-tabs:${applicationKey}`;
}

function readTabState(applicationKey: string) {
  const raw = sessionStorage.getItem(tabStateKey(applicationKey));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApplicationTabState;
  } catch {
    sessionStorage.removeItem(tabStateKey(applicationKey));
    return null;
  }
}

function menuPath(application: NavigationApplication, menuId: string) {
  const menuMap = new Map(application.menus.map((menu) => [menu.id, menu]));
  const segments: string[] = [];
  let menu = menuMap.get(menuId);
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

function frequentMenus(application: NavigationApplication) {
  return application.menus
    .filter((menu) => Boolean(menu.component))
    .toSorted((left, right) => {
      const leftUsage = menuUsage.value[left.id];
      const rightUsage = menuUsage.value[right.id];
      return (
        (rightUsage?.clickCount ?? 0) - (leftUsage?.clickCount ?? 0) ||
        String(rightUsage?.lastClickedAt ?? '').localeCompare(
          String(leftUsage?.lastClickedAt ?? ''),
        ) ||
        left.sort_order - right.sort_order
      );
    })
    .slice(0, 3);
}

async function openApplication(
  application: NavigationApplication,
  targetPath?: string,
) {
  const currentApplicationKey = localStorage.getItem(
    'go-admin.current-application',
  );
  if (currentApplicationKey) {
    sessionStorage.setItem(
      tabStateKey(currentApplicationKey),
      JSON.stringify({
        lastPath:
          typeof route.query.from === 'string' ? route.query.from : undefined,
        tabs: tabbarStore.tabs,
      } satisfies ApplicationTabState),
    );
  }
  const targetState = readTabState(application.key);
  const applicationPath = `/app/${application.key}/`;
  const restoredTabs = (targetState?.tabs ?? []).filter((tab) =>
    tab.path.startsWith(applicationPath),
  );
  tabbarStore.$reset();
  tabbarStore.tabs = restoredTabs;
  await selectApplication(application.key);
  const lastPath = targetState?.lastPath?.startsWith(applicationPath)
    ? targetState.lastPath
    : null;
  // 应用菜单属于动态路由。切换时仅重建应用级路由和标签上下文，
  // 使用 Vue Router 保持 SPA 导航，避免重新下载和初始化整个页面。
  resetRoutes();
  accessStore.setAccessMenus([]);
  accessStore.setAccessRoutes([]);
  accessStore.setIsAccessChecked(false);
  await router.replace(
    targetPath || lastPath || getApplicationHomePath(application),
  );
}

const availableApplications = computed(() =>
  applications.value
    .filter((application) => {
      const search = keyword.value.trim().toLocaleLowerCase('zh-CN');
      return (
        !search ||
        [application.name, application.key, application.description].some(
          (value) =>
            String(value ?? '')
              .toLocaleLowerCase('zh-CN')
              .includes(search),
        )
      );
    })
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
    }),
);
const paginatedApplications = computed(() => {
  const offset = (currentPage.value - 1) * pageSize;
  return availableApplications.value.slice(offset, offset + pageSize);
});
watch(keyword, () => {
  currentPage.value = 1;
});

async function loadApplications() {
  loading.value = true;
  loadError.value = undefined;
  try {
    applications.value = await getNavigationApplications();
  } catch (error) {
    applications.value = [];
    loadError.value = error;
  } finally {
    loading.value = false;
  }
}

async function loadUsage() {
  try {
    const usage = await getMyMenuUsage();
    menuUsage.value = Object.fromEntries(
      usage.map((item) => [
        item.menu_id,
        {
          clickCount: Number(item.click_count),
          lastClickedAt: item.last_clicked_at,
        },
      ]),
    );
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
  } catch {
    menuUsage.value = {};
    applicationUsage.value = {};
  }
}
</script>

<template>
  <Page>
    <GoCapabilityProvider :capabilities="capabilities">
      <GoAuthorizedLoader
        :authorization="listCapability"
        :load="loadApplications"
      />
      <GoAuthorizedLoader
        :authorization="navigationCapability"
        :load="loadUsage"
      />
      <GoAccess action="list" resource="application.current">
        <div class="mx-auto max-w-[1440px] px-6 py-8">
          <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 class="m-0 text-2xl font-semibold text-foreground">
                选择应用
              </h1>
              <p class="mb-0 mt-2 text-sm text-muted-foreground">
                选择要进入的业务应用，左侧菜单将切换为该应用的功能。
              </p>
            </div>
            <Input.Search
              v-model:value="keyword"
              allow-clear
              class="w-80"
              placeholder="搜索应用名称或标识"
            />
          </div>
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
          <Spin :spinning="loading">
            <div
              v-if="paginatedApplications.length"
              class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            >
              <GoAccess
                v-for="application in paginatedApplications"
                :key="application.key"
                action="read"
                resource="application.current"
              >
                <GoAccess action="switch" resource="application.current">
                  <GoAccess action="read" resource="navigation.current">
                    <Card
                      class="group cursor-pointer overflow-hidden border-border/80 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      :body-style="{ padding: '0' }"
                      hoverable
                      @click="openApplication(application)"
                    >
                      <div
                        class="h-1 bg-primary opacity-70 transition-opacity group-hover:opacity-100"
                      ></div>
                      <div class="p-4">
                        <div class="flex items-start gap-3">
                          <div
                            class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/5 text-primary"
                          >
                            <IconifyIcon
                              :icon="application.icon || 'lucide:app-window'"
                              class="size-5"
                            />
                          </div>
                          <div class="min-w-0 flex-1">
                            <div
                              class="flex items-center justify-between gap-2"
                            >
                              <div
                                class="truncate text-[15px] font-semibold text-foreground"
                              >
                                {{ application.name }}
                              </div>
                              <span
                                class="text-muted-foreground transition-transform group-hover:translate-x-0.5"
                                >→</span
                              >
                            </div>
                            <div class="mt-1 flex items-center gap-1">
                              <Tag
                                :color="
                                  application.type === 'platform'
                                    ? 'blue'
                                    : 'green'
                                "
                              >
                                {{
                                  application.type === 'platform'
                                    ? '平台级'
                                    : '组织级'
                                }}
                              </Tag>
                              <Tag
                                class="max-w-full truncate font-mono text-[11px]"
                              >
                                {{ application.key }}
                              </Tag>
                            </div>
                          </div>
                        </div>
                        <div
                          class="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground"
                        >
                          {{
                            application.description ||
                            `${application.menus.length} 个可用功能`
                          }}
                        </div>
                        <div class="mt-3 border-t border-border/60 pt-3">
                          <div class="mb-1.5 text-[11px] text-muted-foreground">
                            常用功能
                          </div>
                          <div class="flex min-h-6 flex-wrap gap-x-3 gap-y-1">
                            <Button
                              v-for="menu in frequentMenus(application)"
                              :key="menu.id"
                              class="h-5 px-0 text-xs"
                              type="link"
                              @click.stop="
                                openApplication(
                                  application,
                                  menuPath(application, menu.id),
                                )
                              "
                            >
                              {{ menu.name }}
                            </Button>
                            <span
                              v-if="!frequentMenus(application).length"
                              class="text-xs text-muted-foreground"
                              >暂无可用菜单</span
                            >
                          </div>
                        </div>
                      </div>
                    </Card>
                  </GoAccess>
                </GoAccess>
              </GoAccess>
            </div>
            <Empty v-else-if="!loading" description="当前组织暂无可用应用" />
            <div
              v-if="availableApplications.length > pageSize"
              class="mt-8 flex justify-end"
            >
              <Pagination
                v-model:current="currentPage"
                :page-size="pageSize"
                :show-size-changer="false"
                :total="availableApplications.length"
                show-less-items
              />
            </div>
          </Spin>
        </div>
      </GoAccess>
    </GoCapabilityProvider>
  </Page>
</template>
