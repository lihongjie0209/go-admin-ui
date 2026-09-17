import type {
  FlatResourcePageContract,
  TreeResourcePageContract,
} from '#/templates/resource/resource-page-contract';

import { triggerScheduledJob } from '#/api/go/scheduled-job';
import { loadPageComponentOptions } from '#/modules/platform/page-component-registry';
import { loadScheduledJobHandlerOptions } from '#/modules/platform/scheduled-job-options';
import {
  loadPBACActionOptions,
  loadPBACResourceOptions,
} from '#/modules/policy/pbac-editor-options';

const enabledOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
];

const actionColumn = {
  field: 'action',
  fixed: 'right' as const,
  title: '操作',
  width: 190,
};

const auditDetailFields = [
  { field: 'created_at', label: '创建时间', presentation: 'datetime' as const },
  { field: 'created_by_name', label: '创建人' },
  { field: 'updated_at', label: '更新时间', presentation: 'datetime' as const },
  { field: 'updated_by_name', label: '更新人' },
  { field: 'version', label: '版本号' },
];

const userStatusNames: Record<string, string> = {
  active: '正常',
  closed: '已关闭',
  disabled: '停用',
  locked: '已锁定',
};

export const userPageContract: FlatResourcePageContract = {
  authorizationResource: 'identity.user',
  detailFields: [
    { field: 'username', label: '用户名' },
    { field: 'display_name', label: '显示名称' },
    { field: 'email', label: '邮箱' },
    { field: 'phone', label: '手机号' },
    {
      field: 'status',
      format: (value) => userStatusNames[String(value)] ?? String(value ?? '—'),
      label: '状态',
    },
    ...auditDetailFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'username',
      label: '用户名',
      placeholder: '小写字母开头，可使用数字、点、横线和下划线',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9._-]{2,63}$/.test(String(value ?? ''))
          ? undefined
          : '用户名格式不正确',
    },
    { field: 'display_name', label: '显示名称', required: true },
    {
      field: 'email',
      label: '邮箱',
      validate: (value) =>
        !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
          ? undefined
          : '邮箱格式不正确',
    },
    { field: 'phone', label: '手机号' },
    {
      component: 'select',
      editOnly: true,
      field: 'status',
      label: '状态',
      options: [
        ...enabledOptions,
        { label: '锁定', value: 'locked' },
        { label: '关闭', value: 'closed' },
      ],
      required: true,
    },
  ],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '用户名、姓名、邮箱或手机号',
      type: 'keyword',
    },
    {
      filterKey: 'ids',
      key: 'ids',
      label: '用户 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'usernames',
      key: 'usernames',
      label: '用户名',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'emails',
      key: 'emails',
      label: '邮箱',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'phones',
      key: 'phones',
      label: '手机号',
      maxItems: 200,
      type: 'id-in',
    },
    {
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: [
        ...enabledOptions,
        { label: '锁定', value: 'locked' },
        { label: '关闭', value: 'closed' },
      ],
      type: 'select',
    },
    { key: 'created_at', label: '创建时间', type: 'date-range' },
  ],
  table: {
    columns: [
      { field: 'username', minWidth: 150, title: '用户名' },
      { field: 'display_name', minWidth: 150, title: '显示名称' },
      { field: 'email', minWidth: 210, title: '邮箱' },
      { field: 'phone', minWidth: 150, title: '手机号' },
      {
        field: 'status',
        format: (value) => userStatusNames[String(value)] ?? String(value),
        minWidth: 100,
        title: '状态',
      },
      {
        field: 'updated_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '更新时间',
      },
      { field: 'updated_by_name', minWidth: 140, title: '更新人' },
      actionColumn,
    ],
    endpoints: {
      create: '/users/create',
      delete: '/users/delete',
      get: '/users/get',
      page: '/users/page',
      update: '/users/update',
    },
  },
};

export const tenantPageContract: FlatResourcePageContract = {
  authorizationResource: 'tenant',
  detailFields: [
    { field: 'code', label: '租户编码' },
    { field: 'name', label: '租户名称' },
    { field: 'description', label: '说明', span: 2 },
    {
      field: 'owner',
      format: (value) =>
        String((value as null | { name?: unknown })?.name ?? '—'),
      label: '负责人',
    },
    {
      displayField: 'status_name',
      field: 'status',
      label: '状态',
      presentation: 'status',
    },
    ...auditDetailFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'code',
      label: '租户编码',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9-]{1,62}$/.test(String(value ?? ''))
          ? undefined
          : '租户编码格式不正确',
    },
    { field: 'name', label: '租户名称', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    {
      createOnly: true,
      field: 'owner_username',
      label: '负责人用户名',
      required: true,
    },
    {
      component: 'select',
      editOnly: true,
      field: 'status',
      label: '状态',
      options: enabledOptions,
      required: true,
    },
  ],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '租户编码或名称',
      type: 'keyword',
    },
    {
      filterKey: 'ids',
      key: 'ids',
      label: '租户 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: enabledOptions,
      type: 'select',
    },
    { key: 'created_at', label: '创建时间', type: 'date-range' },
  ],
  table: {
    columns: [
      { field: 'code', minWidth: 150, title: '租户编码' },
      { field: 'name', minWidth: 180, title: '租户名称' },
      {
        field: 'owner',
        minWidth: 150,
        presentation: 'reference',
        title: '负责人',
      },
      {
        displayField: 'status_name',
        field: 'status',
        minWidth: 100,
        presentation: 'status',
        title: '状态',
      },
      {
        field: 'updated_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '更新时间',
      },
      { field: 'updated_by_name', minWidth: 140, title: '更新人' },
      actionColumn,
    ],
    endpoints: {
      create: '/platform/tenants/create',
      delete: '/platform/tenants/delete',
      get: '/platform/tenants/get',
      page: '/platform/tenants/page',
      update: '/platform/tenants/update',
    },
  },
};

export const platformConfigPageContract: FlatResourcePageContract = {
  authorizationResource: 'platform.config',
  detailFields: [
    { field: 'key', label: '配置键' },
    { field: 'name', label: '名称' },
    { field: 'category', label: '分类' },
    { field: 'value_type', label: '值类型' },
    { field: 'value', label: '配置值', presentation: 'json', span: 2 },
    { field: 'description', label: '说明', span: 2 },
    { field: 'is_public', label: '允许匿名读取', presentation: 'boolean' },
    { field: 'status', label: '状态', presentation: 'status' },
    ...auditDetailFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'key',
      label: '配置键',
      placeholder: '例如 platform.name',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9_.:-]{1,127}$/.test(String(value ?? ''))
          ? undefined
          : '配置键格式不正确',
    },
    { field: 'name', label: '名称', required: true },
    { field: 'category', label: '分类' },
    { component: 'json', field: 'value', label: '配置值', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    {
      component: 'switch',
      defaultValue: false,
      field: 'is_public',
      label: '允许匿名读取',
    },
    {
      component: 'select',
      defaultValue: 'active',
      field: 'status',
      label: '状态',
      options: enabledOptions,
      required: true,
    },
  ],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '配置键、名称或说明',
      type: 'keyword',
    },
    {
      filterKey: 'ids',
      key: 'ids',
      label: '配置 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'categories',
      key: 'categories',
      label: '分类',
      maxItems: 100,
      type: 'id-in',
    },
    {
      key: 'value_types',
      label: '值类型',
      multiple: true,
      options: ['string', 'number', 'boolean', 'object', 'array', 'null'].map(
        (value) => ({ label: value, value }),
      ),
      type: 'select',
    },
    {
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: enabledOptions,
      type: 'select',
    },
    {
      key: 'is_public',
      label: '公开范围',
      options: [
        { label: '允许匿名读取', value: 'true' },
        { label: '仅内部使用', value: 'false' },
      ],
      type: 'select',
    },
    { key: 'created_at', label: '创建时间', type: 'date-range' },
  ],
  table: {
    columns: [
      { field: 'key', minWidth: 210, title: '配置键' },
      { field: 'name', minWidth: 160, title: '名称' },
      { field: 'category', minWidth: 130, title: '分类' },
      { field: 'value_type', minWidth: 100, title: '值类型' },
      {
        field: 'is_public',
        minWidth: 110,
        presentation: 'boolean',
        title: '匿名读取',
      },
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
      create: '/platform-configs/create',
      delete: '/platform-configs/delete',
      get: '/platform-configs/get',
      page: '/platform-configs/page',
      update: '/platform-configs/update',
    },
    mapFilters: (filters) => ({
      ...filters,
      ...(filters.is_public === undefined
        ? {}
        : { is_public: filters.is_public === 'true' }),
    }),
  },
};

export const applicationPageContract: FlatResourcePageContract = {
  authorizationResource: 'application',
  detailFields: [
    { field: 'code', label: '应用编码' },
    { field: 'name', label: '应用名称' },
    { field: 'description', label: '说明', span: 2 },
    { field: 'icon', label: '图标' },
    { field: 'home_path', label: '首页路径' },
    { field: 'sort_order', label: '排序' },
    { field: 'status', label: '状态', presentation: 'status' },
    { field: 'metadata', label: '扩展信息', presentation: 'json', span: 2 },
    ...auditDetailFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'code',
      label: '应用编码',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9-]{1,63}$/.test(String(value ?? ''))
          ? undefined
          : '应用编码格式不正确',
    },
    { field: 'name', label: '应用名称', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    { field: 'icon', label: '图标', placeholder: '图标名称' },
    {
      field: 'home_path',
      label: '首页路径',
      placeholder: '/app/example/home',
      validate: (value) =>
        !value ||
        (/^\/(?!.*(?:\/\/|\.\.))/.test(String(value)) &&
          String(value).length <= 2048)
          ? undefined
          : '首页路径必须是安全的绝对路径',
    },
    {
      component: 'number',
      defaultValue: 0,
      field: 'sort_order',
      label: '排序',
    },
    {
      component: 'select',
      defaultValue: 'active',
      field: 'status',
      label: '状态',
      options: enabledOptions,
      required: true,
    },
    {
      component: 'json',
      defaultValue: {},
      field: 'metadata',
      label: '扩展信息',
      required: true,
    },
  ],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '应用编码或名称',
      type: 'keyword',
    },
    {
      filterKey: 'ids',
      key: 'ids',
      label: '应用 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'codes',
      key: 'codes',
      label: '应用编码',
      maxItems: 200,
      type: 'id-in',
    },
    {
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: enabledOptions,
      type: 'select',
    },
    { key: 'created_at', label: '创建时间', type: 'date-range' },
  ],
  table: {
    columns: [
      { field: 'code', minWidth: 150, title: '应用编码' },
      { field: 'name', minWidth: 180, title: '应用名称' },
      { field: 'home_path', minWidth: 210, title: '首页路径' },
      { field: 'sort_order', minWidth: 90, title: '排序' },
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
      create: '/applications/create',
      delete: '/applications/delete',
      get: '/applications/get',
      page: '/applications/page',
      update: '/applications/update',
    },
  },
};

export const scheduledJobPageContract: FlatResourcePageContract = {
  authorizationResource: 'scheduled-job',
  capabilities: [
    {
      action: 'execute',
      key: 'scheduled-job:execute',
      resource: 'scheduled-job',
    },
  ],
  detailFields: [
    { field: 'code', label: '任务编码' },
    { field: 'name', label: '任务名称' },
    { field: 'description', label: '说明', span: 2 },
    { field: 'cron_spec', label: 'Cron 表达式' },
    { field: 'timezone', label: '时区' },
    { field: 'handler', label: '执行器' },
    { field: 'timeout_seconds', label: '超时（秒）' },
    { field: 'lock_ttl_seconds', label: '锁租期（秒）' },
    { field: 'status', label: '状态', presentation: 'status' },
    { field: 'payload', label: '任务参数', presentation: 'json', span: 2 },
    ...auditDetailFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'code',
      label: '任务编码',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9-]{1,63}$/.test(String(value ?? ''))
          ? undefined
          : '任务编码格式不正确',
    },
    { field: 'name', label: '任务名称', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    {
      field: 'cron_spec',
      label: 'Cron 表达式',
      placeholder: '秒 分 时 日 月 周，例如 0 */5 * * * *',
      required: true,
    },
    {
      defaultValue: 'Asia/Shanghai',
      field: 'timezone',
      label: '时区',
      required: true,
    },
    {
      component: 'select',
      field: 'handler',
      label: '执行器',
      optionLoader: loadScheduledJobHandlerOptions,
      placeholder: '选择代码注册的执行器',
      required: true,
    },
    {
      component: 'number',
      defaultValue: 30,
      field: 'timeout_seconds',
      label: '超时（秒）',
      required: true,
      validate: (value) =>
        Number(value) >= 1 && Number(value) <= 3600
          ? undefined
          : '超时必须在 1 到 3600 秒之间',
    },
    {
      component: 'number',
      defaultValue: 60,
      field: 'lock_ttl_seconds',
      label: '分布式锁租期（秒）',
      required: true,
      validate: (value) =>
        Number(value) >= 1 && Number(value) <= 86_400
          ? undefined
          : '锁租期必须在 1 到 86400 秒之间',
    },
    {
      component: 'select',
      defaultValue: 'active',
      field: 'status',
      label: '状态',
      options: enabledOptions,
      required: true,
    },
    {
      component: 'json',
      defaultValue: {},
      field: 'payload',
      label: '任务参数',
      required: true,
    },
  ],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '任务编码、名称或执行器',
      type: 'keyword',
    },
    {
      filterKey: 'ids',
      key: 'ids',
      label: '任务 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'codes',
      key: 'codes',
      label: '任务编码',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'handlers',
      key: 'handlers',
      label: '执行器',
      maxItems: 200,
      type: 'id-in',
    },
    {
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: enabledOptions,
      type: 'select',
    },
    { key: 'created_at', label: '创建时间', type: 'date-range' },
  ],
  table: {
    columns: [
      { field: 'code', minWidth: 160, title: '任务编码' },
      { field: 'name', minWidth: 180, title: '任务名称' },
      { field: 'cron_spec', minWidth: 160, title: 'Cron 表达式' },
      { field: 'handler', minWidth: 180, title: '执行器' },
      { field: 'timezone', minWidth: 140, title: '时区' },
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
      create: '/scheduled-jobs/create',
      delete: '/scheduled-jobs/delete',
      get: '/scheduled-jobs/get',
      page: '/scheduled-jobs/page',
      update: '/scheduled-jobs/update',
    },
    rowActions: [
      {
        authorization: {
          action: 'execute',
          key: 'scheduled-job:execute',
          resource: 'scheduled-job',
        },
        confirm: (row) => `确认立即执行任务“${String(row.name ?? row.code)}”？`,
        key: 'trigger',
        label: '立即执行',
        run: async (row) => {
          await triggerScheduledJob(String(row.id));
        },
        successMessage: '任务执行完成',
      },
    ],
  },
};

export function scheduledJobRunPageContract(
  scheduledJobID: string,
): FlatResourcePageContract {
  return {
    allowDetail: true,
    authorizationResource: 'scheduled-job',
    detailFields: [
      { field: 'job_code', label: '任务编码' },
      { field: 'job_name', label: '任务名称' },
      { field: 'handler', label: '执行器' },
      { field: 'trigger_source', label: '触发来源' },
      { field: 'status', label: '状态', presentation: 'status' },
      { field: 'duration_ms', label: '耗时（毫秒）' },
      { field: 'request_id', label: 'Request ID' },
      { field: 'trace_id', label: 'Trace ID' },
      { field: 'started_at', label: '开始时间', presentation: 'datetime' },
      { field: 'finished_at', label: '结束时间', presentation: 'datetime' },
      { field: 'error_message', label: '错误摘要', span: 2 },
      ...auditDetailFields,
    ],
    editorFields: [],
    queryFields: [
      {
        key: 'keyword',
        label: '链路标识',
        placeholder: 'Request ID 或 Trace ID',
        type: 'keyword',
      },
      {
        key: 'statuses',
        label: '状态',
        multiple: true,
        options: [
          { label: '成功', value: 'success' },
          { label: '失败', value: 'error' },
          { label: '跳过', value: 'skipped' },
        ],
        type: 'select',
      },
      {
        key: 'trigger_sources',
        label: '触发来源',
        multiple: true,
        options: [
          { label: '定时调度', value: 'cron' },
          { label: '手动执行', value: 'manual' },
        ],
        type: 'select',
      },
      { key: 'started_at', label: '开始时间', type: 'date-range' },
    ],
    table: {
      allowCreate: false,
      allowDelete: false,
      allowEdit: false,
      columns: [
        {
          field: 'status',
          minWidth: 100,
          presentation: 'status',
          title: '状态',
        },
        { field: 'trigger_source', minWidth: 110, title: '触发来源' },
        {
          field: 'started_at',
          minWidth: 180,
          presentation: 'datetime',
          title: '开始时间',
        },
        { field: 'duration_ms', minWidth: 120, title: '耗时（毫秒）' },
        { field: 'request_id', minWidth: 220, title: 'Request ID' },
        { field: 'trace_id', minWidth: 260, title: 'Trace ID' },
        actionColumn,
      ],
      endpoints: {
        create: '',
        delete: '',
        get: '/scheduled-job-runs/get',
        page: '/scheduled-job-runs/page',
        update: '',
      },
      fixedFilters: { scheduled_job_id: scheduledJobID },
    },
  };
}

export const dictionaryPageContract: FlatResourcePageContract = {
  authorizationResource: 'dictionary.definition',
  detailFields: [
    { field: 'code', label: '字典编码' },
    { field: 'name', label: '字典名称' },
    { field: 'type', label: '结构类型' },
    { field: 'source', label: '数据来源' },
    { field: 'status', label: '状态', presentation: 'status' },
    { field: 'description', label: '说明', span: 2 },
    { field: 'extension', label: '扩展信息', presentation: 'json', span: 2 },
    ...auditDetailFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'code',
      label: '字典编码',
      required: true,
    },
    {
      component: 'select',
      createOnly: true,
      field: 'type',
      label: '结构类型',
      options: [
        { label: '枚举', value: 'enum' },
        { label: '树', value: 'tree' },
      ],
      required: true,
    },
    {
      component: 'select',
      createOnly: true,
      field: 'source',
      label: '数据来源',
      options: [
        { label: '静态维护', value: 'static' },
        { label: '代码提供者', value: 'provider' },
      ],
      required: true,
    },
    { field: 'name', label: '字典名称', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    {
      component: 'select',
      defaultValue: 'active',
      field: 'status',
      label: '状态',
      options: enabledOptions,
      required: true,
    },
    {
      component: 'json',
      defaultValue: {},
      field: 'extension',
      label: '扩展信息',
      required: true,
    },
  ],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '字典编码或名称',
      type: 'keyword',
    },
    {
      key: 'types',
      label: '结构类型',
      multiple: true,
      options: [
        { label: '枚举', value: 'enum' },
        { label: '树', value: 'tree' },
      ],
      type: 'select',
    },
    {
      key: 'sources',
      label: '数据来源',
      multiple: true,
      options: [
        { label: '静态维护', value: 'static' },
        { label: '代码提供者', value: 'provider' },
      ],
      type: 'select',
    },
    {
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: enabledOptions,
      type: 'select',
    },
  ],
  table: {
    columns: [
      { field: 'code', minWidth: 190, title: '字典编码' },
      { field: 'name', minWidth: 160, title: '字典名称' },
      {
        field: 'type',
        minWidth: 100,
        format: (value) => (value === 'tree' ? '树' : '枚举'),
        title: '结构类型',
      },
      {
        field: 'source',
        minWidth: 110,
        format: (value) => (value === 'provider' ? '代码提供者' : '静态维护'),
        title: '数据来源',
      },
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
      create: '/dictionaries/create',
      delete: '/dictionaries/delete',
      get: '/dictionaries/get',
      page: '/dictionaries/page',
      update: '/dictionaries/update',
    },
  },
};

export function dictionaryItemPageContract(
  dictionaryID: string,
  dictionaryCode: string,
): FlatResourcePageContract {
  return {
    authorizationResource: 'dictionary.item',
    detailFields: [
      { field: 'code', label: '条目编码' },
      { field: 'name', label: '条目名称' },
      { field: 'value', label: '条目值', span: 2 },
      { field: 'parent_id', label: '父条目 ID' },
      { field: 'sort_order', label: '排序' },
      { field: 'disabled', label: '已禁用', presentation: 'boolean' },
      { field: 'extension', label: '扩展信息', presentation: 'json', span: 2 },
      ...auditDetailFields,
    ],
    editorFields: [
      {
        component: 'hidden',
        createOnly: true,
        field: 'dictionary_id',
        label: '字典 ID',
        required: true,
      },
      {
        component: dictionaryCode ? 'dictionary-tree' : 'input',
        dictionaryKey: dictionaryCode || undefined,
        field: 'parent_id',
        label: '父条目',
        placeholder: '枚举字典留空；树字典可选择父节点',
      },
      { createOnly: true, field: 'code', label: '条目编码', required: true },
      { field: 'name', label: '条目名称', required: true },
      { component: 'textarea', field: 'value', label: '条目值' },
      {
        component: 'number',
        defaultValue: 0,
        field: 'sort_order',
        label: '排序',
      },
      {
        component: 'switch',
        defaultValue: false,
        field: 'disabled',
        label: '禁用',
      },
      {
        component: 'json',
        defaultValue: {},
        field: 'extension',
        label: '扩展信息',
        required: true,
      },
    ],
    editorInitialValues: { dictionary_id: dictionaryID },
    queryFields: [
      {
        key: 'keyword',
        label: '关键词',
        placeholder: '条目编码、名称或值',
        type: 'keyword',
      },
      {
        key: 'disabled',
        label: '状态',
        options: [
          { label: '启用', value: 'false' },
          { label: '禁用', value: 'true' },
        ],
        type: 'select',
      },
      { key: 'parent_id', label: '父条目 ID', type: 'text' },
    ],
    table: {
      columns: [
        { field: 'code', minWidth: 170, title: '条目编码' },
        { field: 'name', minWidth: 180, title: '条目名称' },
        { field: 'value', minWidth: 200, title: '条目值' },
        { field: 'sort_order', minWidth: 90, title: '排序' },
        {
          field: 'disabled',
          minWidth: 90,
          format: (value) => (value ? '禁用' : '启用'),
          title: '状态',
        },
        {
          field: 'updated_at',
          minWidth: 180,
          presentation: 'datetime',
          title: '更新时间',
        },
        actionColumn,
      ],
      endpoints: {
        create: '/dictionary-items/create',
        delete: '/dictionary-items/delete',
        get: '/dictionary-items/get',
        page: '/dictionary-items/page',
        update: '/dictionary-items/update',
      },
      fixedFilters: { dictionary_id: dictionaryID },
      mapFilters: (filters) => ({
        ...filters,
        dictionary_id: dictionaryID,
        ...(filters.disabled === undefined
          ? {}
          : { disabled: filters.disabled === 'true' }),
      }),
    },
  };
}

export function navigationTreeContract(
  applicationID: string,
): TreeResourcePageContract {
  const requiredForMenu =
    (label: string, pattern?: RegExp) =>
    (value: unknown, values: Record<string, unknown>) => {
      if (values.navigation_type !== 'menu') return undefined;
      const text = String(value ?? '').trim();
      return text && (!pattern || pattern.test(text))
        ? undefined
        : `菜单必须填写合法的${label}`;
    };
  return {
    authorizationResource: 'navigation',
    editorFields: [
      {
        component: 'hidden',
        createOnly: true,
        field: 'application_id',
        label: '应用 ID',
        required: true,
      },
      { component: 'hidden', field: 'parent_id', label: '父导航 ID' },
      {
        createOnly: true,
        field: 'navigation_key',
        label: '导航编码',
        required: true,
        validate: (value) =>
          /^[a-z][a-z0-9_.:-]{1,127}$/.test(String(value ?? ''))
            ? undefined
            : '导航编码格式不正确',
      },
      { field: 'name', label: '导航名称', required: true },
      {
        component: 'select',
        field: 'navigation_type',
        label: '类型',
        options: [
          { label: '目录', value: 'directory' },
          { label: '菜单', value: 'menu' },
        ],
        required: true,
      },
      {
        field: 'route_path',
        label: '路由路径',
        placeholder: '/app/platform/users',
        validate: requiredForMenu('路由路径', /^\/[A-Za-z0-9_./:-]*$/),
      },
      {
        component: 'select',
        field: 'component',
        label: '页面组件',
        optionLoader: loadPageComponentOptions,
        placeholder: '选择已编译页面',
        validate: requiredForMenu('页面组件', /^[A-Za-z0-9_./-]+$/),
      },
      { component: 'icon', field: 'icon', label: '图标' },
      {
        component: 'select',
        field: 'resource',
        label: '资源',
        optionLoader: loadPBACResourceOptions,
        placeholder: '选择 PBAC 资源',
        validate: requiredForMenu('资源'),
      },
      {
        clearOnDependencyChange: true,
        component: 'select',
        field: 'action',
        label: '动作',
        optionLoader: loadPBACActionOptions,
        optionsDependsOn: ['resource'],
        placeholder: '先选择资源，再选择动作',
        validate: requiredForMenu('动作'),
      },
      {
        component: 'switch',
        defaultValue: true,
        field: 'visible',
        label: '菜单可见',
      },
      {
        component: 'select',
        defaultValue: 'active',
        field: 'status',
        label: '状态',
        options: enabledOptions,
        required: true,
      },
      {
        component: 'number',
        defaultValue: 0,
        field: 'sort_order',
        label: '排序',
      },
      {
        component: 'json',
        defaultValue: {},
        field: 'metadata',
        label: '扩展信息',
        required: true,
      },
    ],
    editorInitialValues: { application_id: applicationID },
    endpoints: {
      create: '/navigations/create',
      delete: '/navigations/delete',
      get: '/navigations/get',
      page: '/navigations/tree',
      tree: '/navigations/tree',
      update: '/navigations/update',
    },
    fixedFilters: { application_id: applicationID },
  };
}

export const permissionTreeContract: TreeResourcePageContract = {
  authorizationResource: 'permission.definition',
  canDeleteNode: (node) => node.is_system !== true,
  canEditNode: (node) => node.is_system !== true,
  editorFields: [
    { component: 'hidden', field: 'parent_id', label: '父权限 ID' },
    {
      field: 'permission_key',
      label: '权限标识',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9._-]{1,127}$/.test(String(value ?? ''))
          ? undefined
          : '权限标识格式不正确',
    },
    { field: 'name', label: '名称', required: true },
    {
      component: 'select',
      field: 'node_type',
      label: '节点类型',
      options: [
        { label: '分组', value: 'group' },
        { label: '权限', value: 'permission' },
      ],
      required: true,
    },
    {
      component: 'select',
      field: 'resource',
      label: '资源',
      optionLoader: loadPBACResourceOptions,
      placeholder: '选择 PBAC 资源',
      validate: (value, values) =>
        values.node_type !== 'permission' || String(value ?? '').trim()
          ? undefined
          : '权限节点必须绑定资源',
    },
    {
      clearOnDependencyChange: true,
      component: 'select',
      field: 'action',
      label: '动作',
      optionLoader: loadPBACActionOptions,
      optionsDependsOn: ['resource'],
      placeholder: '先选择资源，再选择动作',
      validate: (value, values) =>
        values.node_type !== 'permission' || String(value ?? '').trim()
          ? undefined
          : '权限节点必须绑定动作',
    },
    { component: 'textarea', field: 'description', label: '说明' },
    {
      component: 'number',
      defaultValue: 0,
      field: 'sort_order',
      label: '排序',
    },
    {
      component: 'select',
      defaultValue: 'active',
      field: 'status',
      label: '状态',
      options: enabledOptions,
      required: true,
    },
  ],
  endpoints: {
    create: '/permissions/create',
    delete: '/permissions/delete',
    get: '/permissions/get',
    page: '/permissions/tree',
    tree: '/permissions/tree',
    update: '/permissions/update',
  },
};
