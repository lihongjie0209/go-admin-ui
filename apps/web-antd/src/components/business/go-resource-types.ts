import type {
  GridBatchAction,
  GridColumn,
  GridRowAction,
} from './go-data-grid-types';

import type { ResourceEndpoints, Sort, VersionedRecord } from '#/api/go';

export interface GoResourceQuery {
  filters: Record<string, unknown>;
  keyword: string;
}

export interface GoResourceTableProps {
  allowCreate?: boolean;
  allowDelete?: boolean;
  allowEdit?: boolean;
  authorizationResource: string;
  batchActions?: GridBatchAction[];
  columns: GridColumn[];
  createAction?: () => void;
  defaultSort?: Sort[];
  endpoints: ResourceEndpoints;
  editAction?: (row: Record<string, unknown>) => void;
  fixedFilters?: Record<string, unknown>;
  mapFilters?: (filters: Record<string, unknown>) => Record<string, unknown>;
  toCreate?: (values: Record<string, unknown>) => Record<string, unknown>;
  toUpdate?: (
    values: Record<string, unknown>,
    current: Record<string, unknown> & VersionedRecord,
  ) => Record<string, unknown> & VersionedRecord;
  pageSize?: number;
  query?: GoResourceQuery;
  rowActions?: GridRowAction[];
  rowAuthorization?: boolean;
}
