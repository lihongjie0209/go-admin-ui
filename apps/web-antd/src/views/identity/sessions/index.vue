<script setup lang="ts">
import type { GoResourceTableProps } from '#/components/business/go-resource-types';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import GoAuthorizedActionButton from '#/components/business/GoAuthorizedActionButton.vue';
import GoResourceWorkspace from '#/components/business/GoResourceWorkspace.vue';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';
import { sessionStatusOptions } from '#/modules/identity/resource-contracts';
import {
  logoutAllSessions,
  revokeSession,
} from '#/modules/identity/session-actions';

const workspace = ref<InstanceType<typeof GoResourceWorkspace>>();
const listCapability = {
  action: 'list',
  key: 'identity.session:list',
  resource: 'identity.session',
};
const revokeCapability = {
  action: 'revoke',
  key: 'identity.session:revoke',
  resource: 'identity.session',
};
const logoutCapability = {
  action: 'logout',
  key: 'identity.session:logout',
  resource: 'identity.session',
};

const table: GoResourceTableProps = {
  allowCreate: false,
  allowDelete: false,
  allowEdit: false,
  authorizationResource: 'identity.session',
  columns: [
    { field: 'status', minWidth: 100, presentation: 'status', title: '状态' },
    { field: 'client_ip', minWidth: 140, title: '客户端 IP' },
    { field: 'user_agent', minWidth: 280, title: '客户端' },
    {
      field: 'last_seen_at',
      minWidth: 180,
      presentation: 'datetime',
      title: '最后活动',
    },
    {
      field: 'expires_at',
      minWidth: 180,
      presentation: 'datetime',
      title: '过期时间',
    },
    {
      field: 'created_at',
      minWidth: 180,
      presentation: 'datetime',
      title: '登录时间',
    },
    { field: 'action', fixed: 'right', title: '操作', width: 120 },
  ],
  endpoints: {
    create: '/auth/sessions/page',
    delete: '/auth/sessions/revoke',
    get: '/auth/sessions/page',
    page: '/auth/sessions/page',
    update: '/auth/sessions/revoke',
  },
  rowActions: [
    {
      authorization: revokeCapability,
      confirm: '撤销后该设备需要重新登录，确定继续吗？',
      danger: true,
      key: 'revoke',
      label: '撤销',
      run: revokeSession,
      successMessage: '会话已撤销',
      visible: (row: Record<string, unknown>) => row.status === 'active',
    },
  ],
};

const queryFields = [
  {
    key: 'keyword',
    label: '关键词',
    placeholder: 'IP 或客户端信息',
    type: 'keyword' as const,
  },
  {
    filterKey: 'ids',
    key: 'ids',
    label: '会话 ID',
    maxItems: 200,
    type: 'id-in' as const,
  },
  {
    filterKey: 'client_ips',
    key: 'client_ips',
    label: '客户端 IP',
    maxItems: 200,
    type: 'id-in' as const,
  },
  {
    key: 'statuses',
    label: '状态',
    multiple: true,
    options: sessionStatusOptions,
    type: 'select' as const,
  },
  { key: 'created_at', label: '登录时间', type: 'date-range' as const },
  { key: 'last_seen_at', label: '最后活动', type: 'date-range' as const },
];

function reload() {
  void workspace.value?.reload({ resetPage: true });
}
</script>

<template>
  <Page title="登录会话" description="查看当前账号的登录设备并撤销可疑会话。">
    <GoCapabilityProvider
      :capabilities="[listCapability, revokeCapability, logoutCapability]"
    >
      <div class="flex min-h-0 flex-1 flex-col gap-4">
        <div class="flex justify-end">
          <GoAuthorizedActionButton
            :authorization="logoutCapability"
            confirm="这会撤销当前账号的全部登录会话，确定继续吗？"
            danger
            label="退出全部设备"
            :run="logoutAllSessions"
            success-message="全部会话已撤销"
            @completed="reload"
          />
        </div>
        <GoResourceWorkspace
          ref="workspace"
          :query-fields="queryFields"
          :table="table"
        />
      </div>
    </GoCapabilityProvider>
  </Page>
</template>
