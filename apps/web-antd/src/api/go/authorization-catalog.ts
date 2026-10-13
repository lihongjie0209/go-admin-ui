import type { PageResult, VersionedRecord } from './contracts';

import { requestClient } from '#/api/request';

export type AuthorizationScope = 'platform' | 'principal' | 'tenant';
export type CatalogSource = 'code' | 'manual';
export type CatalogStatus = 'active' | 'disabled';

export interface CatalogResource extends VersionedRecord {
  description: string;
  name: string;
  resource_key: string;
  scope: AuthorizationScope;
  source: CatalogSource;
  status: CatalogStatus;
}

export interface CatalogAction extends VersionedRecord {
  action_key: string;
  description: string;
  name: string;
  resource_id: string;
  resource_key: string;
  source: CatalogSource;
  status: CatalogStatus;
}

export interface PlatformPermissionGrant extends VersionedRecord {
  permission_id: string;
  permission_key: string;
  permission_name: string;
  principal_id: string;
  principal_name: string;
  principal_type: 'service_account' | 'user';
}

export interface PermissionAction {
  action_key: string;
  action_name: string;
  id: string;
  resource_key: string;
  resource_name: string;
  scope: AuthorizationScope;
}

export interface CatalogPageRequest {
  ids?: string[];
  keyword?: string;
  page?: number;
  page_size?: number;
  resource_id?: string;
  sources?: CatalogSource[];
  statuses?: CatalogStatus[];
}

export function pageCatalogResources(
  input: CatalogPageRequest,
  signal?: AbortSignal,
) {
  return requestClient.post<PageResult<CatalogResource>>(
    '/authorization/resources/page',
    input,
    { signal },
  );
}

export function pageCatalogActions(
  input: CatalogPageRequest,
  signal?: AbortSignal,
) {
  return requestClient.post<PageResult<CatalogAction>>(
    '/authorization/actions/page',
    input,
    { signal },
  );
}

export function pagePlatformPermissionGrants(
  input: {
    keyword?: string;
    page?: number;
    page_size?: number;
    permission_ids?: string[];
    principal_id?: string;
    principal_type?: 'service_account' | 'user';
  },
  signal?: AbortSignal,
) {
  return requestClient.post<PageResult<PlatformPermissionGrant>>(
    '/platform/permission-grants/page',
    input,
    { signal },
  );
}

export function getPermissionActions(id: string, signal?: AbortSignal) {
  return requestClient.post<PermissionAction[]>(
    '/permissions/actions/get',
    { id },
    { signal },
  );
}

export function setPermissionActions(
  id: string,
  version: number,
  actionIds: string[],
) {
  return requestClient.post<VersionedRecord>('/permissions/actions/set', {
    action_ids: actionIds,
    id,
    version,
  });
}
