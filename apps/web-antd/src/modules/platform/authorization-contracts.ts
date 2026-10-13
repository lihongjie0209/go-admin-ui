import type { FlatResourcePageContract } from '#/templates/resource/resource-page-contract';

import {
  loadCatalogResourceIDOptions,
  loadPlatformPermissionOptions,
  loadPrincipalOptions,
} from './authorization-options';

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
];

const sourceOptions = [
  { label: '代码', value: 'code' },
  { label: '手工', value: 'manual' },
];

const actionColumn = {
  field: 'action',
  fixed: 'right' as const,
  title: '操作',
  width: 190,
};

const catalogAuditFields = [
  { field: 'created_at', label: '创建时间', presentation: 'datetime' as const },
  { field: 'updated_at', label: '更新时间', presentation: 'datetime' as const },
  { field: 'version', label: '版本号' },
];

const manual = (row: Record<string, unknown>) => row.source === 'manual';

export const authorizationResourceContract: FlatResourcePageContract = {
  authorizationResource: 'authorization.resource',
  detailFields: [
    { field: 'resource_key', label: '资源标识' },
    { field: 'name', label: '名称' },
    { field: 'description', label: '说明' },
    { field: 'scope', label: '范围' },
    { field: 'source', label: '来源' },
    { field: 'status', label: '状态' },
    ...catalogAuditFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'resource_key',
      label: '资源标识',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/.test(String(value ?? ''))
          ? undefined
          : '请使用小写字母、数字、点或横线',
    },
    { field: 'name', label: '名称', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    {
      component: 'select',
      createOnly: true,
      field: 'scope',
      label: '范围',
      options: [
        { label: '平台', value: 'platform' },
        { label: '租户', value: 'tenant' },
        { label: '当前主体', value: 'principal' },
      ],
      required: true,
    },
    {
      component: 'select',
      defaultValue: 'active',
      field: 'status',
      label: '状态',
      options: statusOptions,
      required: true,
    },
  ],
  queryFields: [
    { key: 'keyword', label: '关键词', type: 'keyword' },
    { key: 'ids', label: '资源 ID', maxItems: 200, type: 'id-in' },
    {
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: statusOptions,
      type: 'select',
    },
    {
      key: 'sources',
      label: '来源',
      multiple: true,
      options: sourceOptions,
      type: 'select',
    },
  ],
  table: {
    canDeleteRecord: manual,
    canEditRecord: manual,
    columns: [
      { field: 'resource_key', minWidth: 220, title: '资源标识' },
      { field: 'name', minWidth: 160, title: '名称' },
      { field: 'scope', minWidth: 110, title: '范围' },
      { field: 'source', minWidth: 100, title: '来源' },
      { field: 'status', minWidth: 100, presentation: 'status', title: '状态' },
      {
        field: 'updated_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '更新时间',
      },
      actionColumn,
    ],
    endpoints: {
      create: '/authorization/resources/create',
      delete: '/authorization/resources/delete',
      get: '/authorization/resources/get',
      page: '/authorization/resources/page',
      update: '/authorization/resources/update',
    },
    toUpdate: (values, current) => ({
      ...values,
      id: current.id,
      resource_key: current.resource_key,
      scope: current.scope,
      version: current.version,
    }),
  },
};

export const authorizationActionContract: FlatResourcePageContract = {
  authorizationResource: 'authorization.action',
  detailFields: [
    { field: 'resource_key', label: '资源标识' },
    { field: 'action_key', label: '动作标识' },
    { field: 'name', label: '名称' },
    { field: 'description', label: '说明' },
    { field: 'source', label: '来源' },
    { field: 'status', label: '状态' },
    ...catalogAuditFields,
  ],
  editorFields: [
    {
      component: 'select',
      createOnly: true,
      field: 'resource_id',
      label: '资源',
      optionLoader: loadCatalogResourceIDOptions,
      required: true,
    },
    {
      createOnly: true,
      field: 'action_key',
      label: '动作标识',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9-]{1,63}$/.test(String(value ?? ''))
          ? undefined
          : '请使用小写字母、数字或横线',
    },
    { field: 'name', label: '名称', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    {
      component: 'select',
      defaultValue: 'active',
      field: 'status',
      label: '状态',
      options: statusOptions,
      required: true,
    },
  ],
  queryFields: [
    { key: 'keyword', label: '关键词', type: 'keyword' },
    { key: 'ids', label: '动作 ID', maxItems: 200, type: 'id-in' },
    { key: 'resource_id', label: '资源 ID', type: 'text' },
    {
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: statusOptions,
      type: 'select',
    },
    {
      key: 'sources',
      label: '来源',
      multiple: true,
      options: sourceOptions,
      type: 'select',
    },
  ],
  table: {
    canDeleteRecord: manual,
    canEditRecord: manual,
    columns: [
      { field: 'resource_key', minWidth: 220, title: '资源' },
      { field: 'action_key', minWidth: 140, title: '动作标识' },
      { field: 'name', minWidth: 150, title: '名称' },
      { field: 'source', minWidth: 100, title: '来源' },
      { field: 'status', minWidth: 100, presentation: 'status', title: '状态' },
      actionColumn,
    ],
    endpoints: {
      create: '/authorization/actions/create',
      delete: '/authorization/actions/delete',
      get: '/authorization/actions/get',
      page: '/authorization/actions/page',
      update: '/authorization/actions/update',
    },
    toUpdate: (values, current) => ({
      ...values,
      action_key: current.action_key,
      id: current.id,
      resource_id: current.resource_id,
      version: current.version,
    }),
  },
};

export const platformPermissionGrantContract: FlatResourcePageContract = {
  authorizationResource: 'authorization.platform-grant',
  detailFields: [
    { field: 'principal_type', label: '主体类型' },
    { field: 'principal_name', label: '主体' },
    { field: 'permission_key', label: '权限标识' },
    { field: 'permission_name', label: '权限名称' },
    ...catalogAuditFields,
  ],
  editorFields: [
    {
      component: 'select',
      field: 'principal_type',
      label: '主体类型',
      options: [
        { label: '用户', value: 'user' },
        { label: '服务账号', value: 'service_account' },
      ],
      required: true,
    },
    {
      clearOnDependencyChange: true,
      component: 'select',
      field: 'principal_id',
      label: '主体',
      optionLoader: loadPrincipalOptions,
      optionsDependsOn: ['principal_type'],
      required: true,
    },
    {
      component: 'select',
      field: 'permission_id',
      label: '平台权限',
      optionLoader: loadPlatformPermissionOptions,
      required: true,
    },
  ],
  queryFields: [
    { key: 'keyword', label: '权限名称或标识', type: 'keyword' },
    {
      key: 'principal_type',
      label: '主体类型',
      options: [
        { label: '用户', value: 'user' },
        { label: '服务账号', value: 'service_account' },
      ],
      type: 'select',
    },
    { key: 'principal_id', label: '主体 ID', type: 'text' },
    { key: 'permission_ids', label: '权限 ID', maxItems: 200, type: 'id-in' },
  ],
  table: {
    columns: [
      { field: 'principal_type', minWidth: 110, title: '主体类型' },
      { field: 'principal_name', minWidth: 170, title: '主体' },
      { field: 'permission_key', minWidth: 210, title: '权限标识' },
      { field: 'permission_name', minWidth: 150, title: '权限名称' },
      {
        field: 'updated_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '更新时间',
      },
      actionColumn,
    ],
    endpoints: {
      create: '/platform/permission-grants/create',
      delete: '/platform/permission-grants/delete',
      get: '/platform/permission-grants/get',
      page: '/platform/permission-grants/page',
      update: '/platform/permission-grants/update',
    },
  },
};
