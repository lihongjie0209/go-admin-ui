import type { FlatResourcePageContract } from '#/templates/resource/resource-page-contract';

export function formatBytes(value: unknown) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[index]}`;
}

export const filePageContract: FlatResourcePageContract = {
  authorizationResource: 'file.object',
  capabilities: [
    { action: 'create', key: 'file.object:create', resource: 'file.object' },
    {
      action: 'download',
      key: 'file.object:download',
      resource: 'file.object',
    },
  ],
  detailFields: [
    { field: 'original_name', label: '文件名', span: 2 },
    { field: 'content_type', label: '内容类型' },
    { field: 'size_bytes', format: formatBytes, label: '文件大小' },
    { field: 'checksum_sha256', label: 'SHA-256', span: 2 },
    { field: 'etag', label: 'ETag', span: 2 },
    { field: 'created_at', label: '上传时间', presentation: 'datetime' },
    {
      field: 'created_by',
      label: '上传人',
      displayField: 'created_by_name',
      presentation: 'reference',
    },
    { field: 'updated_at', label: '更新时间', presentation: 'datetime' },
    {
      field: 'updated_by',
      label: '更新人',
      displayField: 'updated_by_name',
      presentation: 'reference',
    },
    { field: 'version', label: '版本号' },
  ],
  editorFields: [],
  queryFields: [
    {
      key: 'keyword',
      label: '关键词',
      placeholder: '文件名或内容类型',
      type: 'keyword',
    },
    {
      filterKey: 'ids',
      key: 'ids',
      label: '文件 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      filterKey: 'content_types',
      key: 'content_types',
      label: '内容类型',
      maxItems: 100,
      type: 'id-in',
    },
    {
      filterKey: 'created_by_ids',
      key: 'created_by_ids',
      label: '上传人 ID',
      maxItems: 200,
      type: 'id-in',
    },
    {
      fromKey: 'size_from',
      key: 'size',
      label: '文件大小（字节）',
      toKey: 'size_to',
      type: 'number-range',
    },
    { key: 'created_at', label: '上传时间', type: 'date-range' },
  ],
  table: {
    allowCreate: false,
    allowEdit: false,
    columns: [
      { field: 'original_name', minWidth: 240, title: '文件名' },
      { field: 'content_type', minWidth: 180, title: '内容类型' },
      {
        field: 'size_bytes',
        format: formatBytes,
        minWidth: 120,
        title: '大小',
      },
      {
        field: 'created_by',
        displayField: 'created_by_name',
        minWidth: 150,
        presentation: 'reference',
        title: '上传人',
      },
      {
        field: 'created_at',
        minWidth: 180,
        presentation: 'datetime',
        title: '上传时间',
      },
      { field: 'action', fixed: 'right', title: '操作', width: 210 },
    ],
    endpoints: {
      create: '/files/upload',
      delete: '/files/delete',
      get: '/files/get',
      page: '/files/page',
      update: '/files/get',
    },
  },
};
