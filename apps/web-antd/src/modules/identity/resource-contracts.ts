import type { FlatResourcePageContract } from '#/templates/resource/resource-page-contract';

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
];

const auditFields = [
  { field: 'created_at', label: '创建时间', presentation: 'datetime' as const },
  { field: 'created_by_name', label: '创建人' },
  { field: 'updated_at', label: '更新时间', presentation: 'datetime' as const },
  { field: 'updated_by_name', label: '更新人' },
  { field: 'version', label: '版本号' },
];

export const serviceAccountPageContract: FlatResourcePageContract = {
  authorizationResource: 'identity.service-account',
  detailFields: [
    { field: 'client_id', label: '客户端 ID' },
    { field: 'name', label: '名称' },
    { field: 'description', label: '说明', span: 2 },
    { field: 'status', label: '状态', presentation: 'status' },
    { field: 'expires_at', label: '过期时间', presentation: 'datetime' },
    { field: 'last_used_at', label: '最后使用时间', presentation: 'datetime' },
    { field: 'failed_attempts', label: '失败次数' },
    { field: 'locked_until', label: '锁定至', presentation: 'datetime' },
    ...auditFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'client_id',
      label: '客户端 ID',
      placeholder: '例如 billing-worker',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9._-]{2,127}$/.test(String(value ?? ''))
          ? undefined
          : '客户端 ID 必须以小写字母开头，只能包含小写字母、数字、点、下划线和连字符',
    },
    { field: 'name', label: '名称', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    { component: 'datetime', field: 'expires_at', label: '过期时间' },
    {
      component: 'select',
      editOnly: true,
      field: 'status',
      label: '状态',
      options: statusOptions,
      required: true,
    },
  ],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '客户端 ID、名称或说明',
      type: 'keyword',
    },
    {
      filterKey: 'ids',
      key: 'ids',
      label: '账号 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'client_ids',
      key: 'client_ids',
      label: '客户端 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: statusOptions,
      type: 'select',
    },
    { key: 'created_at', label: '创建时间', type: 'date-range' },
    { key: 'expires_at', label: '过期时间', type: 'date-range' },
  ],
  table: {
    columns: [
      { field: 'client_id', minWidth: 190, title: '客户端 ID' },
      { field: 'name', minWidth: 180, title: '名称' },
      { field: 'status', minWidth: 100, presentation: 'status', title: '状态' },
      {
        field: 'expires_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '过期时间',
      },
      {
        field: 'last_used_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '最后使用',
      },
      {
        field: 'updated_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '更新时间',
      },
      { field: 'action', fixed: 'right', title: '操作', width: 250 },
    ],
    endpoints: {
      create: '/service-accounts/create',
      delete: '/service-accounts/delete',
      get: '/service-accounts/get',
      page: '/service-accounts/page',
      update: '/service-accounts/update',
    },
  },
};

export const sessionStatusOptions = [
  { label: '有效', value: 'active' },
  { label: '已过期', value: 'expired' },
  { label: '已撤销', value: 'revoked' },
];
