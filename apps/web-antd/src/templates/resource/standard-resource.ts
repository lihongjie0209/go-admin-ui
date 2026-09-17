import type { CapabilityRequest, ResourceEndpoints, Sort } from '#/api/go';
import type { ResourceDetailField } from '#/components/business/detail-contract';
import type { ResourceEditorField } from '#/components/business/editor-contract';
import type { GridColumn } from '#/components/business/go-data-grid-types';
import type { QueryField } from '#/components/foundation/query-contract';

export interface StandardResourceTemplate {
  authorizationResource: string;
  capabilities: CapabilityRequest[];
  columns: GridColumn[];
  detailFields: ResourceDetailField[];
  endpoints: ResourceEndpoints;
  fields: ResourceEditorField[];
  queryFields: QueryField[];
  sort: Sort[];
}

// Copy this declaration into a concrete module and replace only its semantic
// resource name, endpoint root, fields, columns, filters and permissions.
export const standardResourceTemplate: StandardResourceTemplate = {
  authorizationResource: 'resource',
  capabilities: [
    { action: 'create', key: 'resource:create', resource: 'resource' },
    { action: 'update', key: 'resource:update', resource: 'resource' },
    { action: 'delete', key: 'resource:delete', resource: 'resource' },
  ],
  columns: [
    { field: 'name', minWidth: 180, title: '名称' },
    { field: 'status', minWidth: 120, title: '状态' },
    { field: 'version', minWidth: 100, title: '版本' },
    { field: 'updated_at', minWidth: 180, title: '更新时间' },
    { field: 'updated_by_name', minWidth: 160, title: '更新人' },
    {
      field: 'action',
      fixed: 'right',
      title: '操作',
      width: 180,
    },
  ],
  detailFields: [
    { field: 'name', label: '名称' },
    {
      dictionaryKey: 'resource.status',
      field: 'status',
      label: '状态',
      presentation: 'dictionary',
    },
  ],
  endpoints: {
    create: '/resources/create',
    delete: '/resources/delete',
    get: '/resources/get',
    page: '/resources/page',
    update: '/resources/update',
  },
  fields: [
    { field: 'name', label: '名称', required: true },
    {
      component: 'dictionary',
      dictionaryKey: 'resource.status',
      field: 'status',
      label: '状态',
      required: true,
    },
  ],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '搜索名称',
      type: 'keyword',
    },
    {
      dictionaryKey: 'resource.status',
      key: 'statuses',
      label: '状态',
      multiple: true,
      type: 'dictionary',
    },
    { key: 'created_at', label: '创建时间', type: 'date-range' },
  ],
  sort: [{ direction: 'desc', field: 'created_at' }],
};
