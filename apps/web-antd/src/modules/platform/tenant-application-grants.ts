import { requestClient } from '#/api/request';

export interface ApplicationOption {
  code: string;
  id: string;
  name: string;
  status: string;
}

export interface TenantApplicationGrant extends Record<string, unknown> {
  application_code: string;
  application_home_path: string;
  application_icon: string;
  application_id: string;
  application_name: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  expires_at?: null | string;
  id: string;
  starts_at?: null | string;
  status: 'active' | 'revoked';
  tenant_id: string;
  tenant_name: string;
  updated_at: string;
  updated_by: string;
  updated_by_name: string;
  version: number;
}

export interface TenantApplicationGrantPage {
  items: TenantApplicationGrant[];
  page: number;
  page_size: number;
  total: number;
}

export function pageTenantApplicationGrants(
  request: Record<string, unknown>,
  signal?: AbortSignal,
) {
  return requestClient.post<TenantApplicationGrantPage>(
    '/platform/tenant-applications/page',
    request,
    { signal },
  );
}

export function getTenantApplicationGrant(
  tenantID: string,
  id: string,
  signal?: AbortSignal,
) {
  return requestClient.post<TenantApplicationGrant>(
    '/platform/tenant-applications/get',
    { id, tenant_id: tenantID },
    { signal },
  );
}

export async function listActiveApplications(signal?: AbortSignal) {
  const result = await requestClient.post<{
    items: ApplicationOption[];
  }>(
    '/applications/page',
    {
      page: 1,
      page_size: 200,
      sort: [{ direction: 'asc', field: 'name' }],
      statuses: ['active'],
    },
    { signal },
  );
  return result.items;
}

export function grantTenantApplication(input: {
  application_id: string;
  expires_at: null | string;
  starts_at: null | string;
  tenant_id: string;
  version: number;
}) {
  return requestClient.post<TenantApplicationGrant>(
    '/platform/tenant-applications/grant',
    input,
  );
}

export function revokeTenantApplication(grant: TenantApplicationGrant) {
  return requestClient.post('/platform/tenant-applications/revoke', {
    id: grant.id,
    tenant_id: grant.tenant_id,
    version: grant.version,
  });
}

export function grantVersion(
  grants: TenantApplicationGrant[],
  applicationID: string,
) {
  return (
    grants.find((item) => item.application_id === applicationID)?.version ?? 0
  );
}

export async function findTenantApplicationGrant(
  tenantID: string,
  applicationID: string,
) {
  const result = await pageTenantApplicationGrants({
    application_ids: [applicationID],
    page: 1,
    page_size: 1,
    statuses: [],
    tenant_id: tenantID,
  });
  return result.items[0];
}
