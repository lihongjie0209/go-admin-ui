import type {
  FlatResourcePageContract,
  TreeResourcePageContract,
} from '#/templates/resource/resource-page-contract';

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
];

const actionColumn = {
  field: 'action',
  fixed: 'right' as const,
  title: '操作',
  width: 210,
};

const auditFields = [
  { field: 'created_at', label: '创建时间', presentation: 'datetime' as const },
  { field: 'created_by_name', label: '创建人' },
  { field: 'updated_at', label: '更新时间', presentation: 'datetime' as const },
  { field: 'updated_by_name', label: '更新人' },
  { field: 'version', label: '版本号' },
];

export const tenantProfilePageContract: FlatResourcePageContract = {
  authorizationResource: 'tenant.profile',
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
    { field: 'status', label: '状态', presentation: 'status' },
    ...auditFields,
  ],
  editorFields: [
    { field: 'name', label: '租户名称', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    {
      component: 'select',
      field: 'status',
      label: '状态',
      options: statusOptions,
      required: true,
    },
  ],
  queryFields: [],
  table: {
    allowCreate: false,
    columns: [
      { field: 'code', minWidth: 160, title: '租户编码' },
      { field: 'name', minWidth: 200, title: '租户名称' },
      { field: 'description', minWidth: 260, title: '说明' },
      {
        field: 'owner',
        minWidth: 160,
        presentation: 'reference',
        title: '负责人',
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
      create: '/platform/tenants/create',
      delete: '/tenants/delete',
      get: '/tenants/get',
      page: '/tenants/page',
      update: '/tenants/update',
    },
    pageSize: 1,
  },
};

export const tenantMemberPageContract: FlatResourcePageContract = {
  authorizationResource: 'tenant.member',
  detailFields: [
    { field: 'username', label: '用户名' },
    { field: 'display_name', label: '姓名' },
    {
      displayField: 'display_name',
      field: 'user_id',
      label: '用户',
      presentation: 'reference',
    },
    { field: 'status', label: '状态', presentation: 'status' },
    { field: 'joined_at', label: '加入时间', presentation: 'datetime' },
    ...auditFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'username',
      label: '用户名',
      placeholder: '输入全局唯一用户名',
      required: true,
    },
    {
      component: 'select',
      editOnly: true,
      field: 'status',
      label: '成员状态',
      options: statusOptions,
      required: true,
    },
  ],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '用户名或姓名',
      type: 'keyword',
    },
    {
      filterKey: 'ids',
      key: 'ids',
      label: '成员 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'user_ids',
      key: 'user_ids',
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
      key: 'statuses',
      label: '状态',
      multiple: true,
      options: statusOptions,
      type: 'select',
    },
    {
      fromKey: 'joined_from',
      key: 'joined_at',
      label: '加入时间',
      toKey: 'joined_to',
      type: 'date-range',
    },
  ],
  table: {
    columns: [
      { field: 'username', minWidth: 150, title: '用户名' },
      { field: 'display_name', minWidth: 160, title: '姓名' },
      { field: 'status', minWidth: 100, presentation: 'status', title: '状态' },
      {
        field: 'joined_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '加入时间',
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
      create: '/tenant-members/add',
      delete: '/tenant-members/remove',
      get: '/tenant-members/get',
      page: '/tenant-members/page',
      update: '/tenant-members/status/update',
    },
    rowAuthorization: true,
  },
};

export const tenantRolePageContract: FlatResourcePageContract = {
  authorizationResource: 'tenant.role',
  detailFields: [
    { field: 'code', label: '角色编码' },
    { field: 'name', label: '角色名称' },
    { field: 'description', label: '说明', span: 2 },
    { field: 'status', label: '状态', presentation: 'status' },
    ...auditFields,
  ],
  editorFields: [
    {
      createOnly: true,
      field: 'code',
      label: '角色编码',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9_-]{1,62}$/.test(String(value ?? ''))
          ? undefined
          : '角色编码格式不正确',
    },
    { field: 'name', label: '角色名称', required: true },
    { component: 'textarea', field: 'description', label: '说明' },
    {
      component: 'hidden',
      createOnly: true,
      defaultValue: [],
      field: 'permission_ids',
      label: '权限',
    },
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
      placeholder: '角色编码或名称',
      type: 'keyword',
    },
    {
      filterKey: 'ids',
      key: 'ids',
      label: '角色 ID',
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
  ],
  table: {
    columns: [
      { field: 'code', minWidth: 160, title: '角色编码' },
      { field: 'name', minWidth: 180, title: '角色名称' },
      { field: 'description', minWidth: 240, title: '说明' },
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
      create: '/tenant-roles/create',
      delete: '/tenant-roles/delete',
      get: '/tenant-roles/get',
      page: '/tenant-roles/page',
      update: '/tenant-roles/update',
    },
    rowAuthorization: true,
  },
};

export const tenantDepartmentTreeContract: TreeResourcePageContract = {
  authorizationResource: 'tenant.department',
  capabilities: [
    {
      action: 'assign-member',
      key: 'tenant.department:assign-member',
      resource: 'tenant.department',
    },
  ],
  editorFields: [
    { component: 'hidden', field: 'parent_id', label: '父部门 ID' },
    {
      createOnly: true,
      field: 'code',
      label: '部门编码',
      required: true,
      validate: (value) =>
        /^[a-z][a-z0-9_-]{1,62}$/.test(String(value ?? ''))
          ? undefined
          : '部门编码格式不正确',
    },
    { field: 'name', label: '部门名称', required: true },
    {
      component: 'number',
      defaultValue: 0,
      field: 'sort_order',
      label: '排序',
    },
  ],
  endpoints: {
    create: '/tenant-departments/create',
    delete: '/tenant-departments/delete',
    get: '/tenant-departments/get',
    page: '/tenant-departments/tree',
    tree: '/tenant-departments/tree',
    update: '/tenant-departments/update',
  },
  rowAuthorization: true,
  rowAuthorizationActions: ['update', 'delete', 'assign-member'],
};
