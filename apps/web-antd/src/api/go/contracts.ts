export interface ApiEnvelope<T> {
  body: T;
  code: number;
  message: string;
  request_id?: string;
}

export interface ApiErrorBody {
  code?: number;
  message?: string;
  request_id?: string;
}

export interface PageRequest<
  F extends Record<string, unknown> = Record<string, unknown>,
> {
  filters?: F;
  keyword?: string;
  page: number;
  page_size: number;
  sort?: Sort[];
}

export interface PageResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface Sort {
  direction: 'asc' | 'desc';
  field: string;
}

export interface VersionedRecord {
  id: string;
  version: number;
}

export interface AuditRecord extends VersionedRecord {
  created_at: string;
  created_by: string;
  created_by_name: string;
  updated_at: string;
  updated_by: string;
  updated_by_name: string;
}

export const API_CODE_OK = 0;
export const API_CODE_UNAUTHORIZED = 20_001;
export const API_CODE_VERSION_CONFLICT = 30_011;
