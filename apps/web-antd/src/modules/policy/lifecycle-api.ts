import { parse, stringify } from 'yaml';

import { requestClient } from '#/api/request';

export type PolicyDomain = 'data-permission' | 'pbac';
export type PolicyScope = 'global' | 'tenant';

export interface PolicyLifecycleKind {
  domain: PolicyDomain;
  scope: PolicyScope;
}

export interface PolicyRecord extends Record<string, unknown> {
  code: string;
  id: string;
  name: string;
  published_version_number?: null | number;
  scope: PolicyScope;
  status: 'active' | 'disabled';
  version: number;
}

export interface PolicyVersionRecord extends Record<string, unknown> {
  created_at?: string;
  created_by?: string;
  document: string;
  id: string;
  policy_id: string;
  published_at?: null | string;
  published_by?: null | string;
  status: 'archived' | 'draft' | 'published';
  version: number;
  version_number: number;
}

export interface PolicyVersionPage {
  items: PolicyVersionRecord[];
  page: number;
  page_size: number;
  total: number;
}

interface PolicyEndpoints {
  create: string;
  get: string;
  page: string;
  publish: string;
  setStatus: string;
  simulate: string;
  versionCreate: string;
  versionGet: string;
  versionPage: string;
}

const policyEndpoints: Record<
  PolicyDomain,
  Record<PolicyScope, PolicyEndpoints>
> = {
  'data-permission': {
    global: {
      create: '/data-permissions/global-policies/create',
      get: '/data-permissions/global-policies/get',
      page: '/data-permissions/global-policies/page',
      publish: '/data-permissions/global-policies/publish',
      setStatus: '/data-permissions/global-policies/status/set',
      simulate: '/data-permissions/global-policies/simulate',
      versionCreate: '/data-permissions/global-policies/versions/create',
      versionGet: '/data-permissions/global-policies/versions/get',
      versionPage: '/data-permissions/global-policies/versions/page',
    },
    tenant: {
      create: '/data-permissions/tenant-policies/create',
      get: '/data-permissions/tenant-policies/get',
      page: '/data-permissions/tenant-policies/page',
      publish: '/data-permissions/tenant-policies/publish',
      setStatus: '/data-permissions/tenant-policies/status/set',
      simulate: '/data-permissions/tenant-policies/simulate',
      versionCreate: '/data-permissions/tenant-policies/versions/create',
      versionGet: '/data-permissions/tenant-policies/versions/get',
      versionPage: '/data-permissions/tenant-policies/versions/page',
    },
  },
  pbac: {
    global: {
      create: '/pbac/global-policies/create',
      get: '/pbac/global-policies/get',
      page: '/pbac/global-policies/page',
      publish: '/pbac/global-policies/publish',
      setStatus: '/pbac/global-policies/status/set',
      simulate: '/pbac/global-policies/simulate',
      versionCreate: '/pbac/global-policies/versions/create',
      versionGet: '/pbac/global-policies/versions/get',
      versionPage: '/pbac/global-policies/versions/page',
    },
    tenant: {
      create: '/pbac/tenant-policies/create',
      get: '/pbac/tenant-policies/get',
      page: '/pbac/tenant-policies/page',
      publish: '/pbac/tenant-policies/publish',
      setStatus: '/pbac/tenant-policies/status/set',
      simulate: '/pbac/tenant-policies/simulate',
      versionCreate: '/pbac/tenant-policies/versions/create',
      versionGet: '/pbac/tenant-policies/versions/get',
      versionPage: '/pbac/tenant-policies/versions/page',
    },
  },
};

function endpoints(kind: PolicyLifecycleKind) {
  return policyEndpoints[kind.domain][kind.scope];
}

export function policyAuthorizationResource(kind: PolicyLifecycleKind) {
  const domain = kind.domain === 'pbac' ? 'pbac' : 'data-permission';
  return `${domain}.${kind.scope}-policy`;
}

export function policyResourceEndpoints(kind: PolicyLifecycleKind) {
  const endpoint = endpoints(kind);
  return {
    create: endpoint.create,
    delete: endpoint.setStatus,
    get: endpoint.get,
    page: endpoint.page,
    update: endpoint.setStatus,
  };
}

export function parsePolicyDocument(document: string): Record<string, unknown> {
  const value = parse(document);
  if (!value || Array.isArray(value) || typeof value !== 'object')
    throw new Error('策略文档必须是一个对象');
  return value as Record<string, unknown>;
}

export function formatPolicyDocument(policy: Record<string, unknown>) {
  return stringify(policy, { lineWidth: 100 });
}

export function defaultPolicyDocument(
  kind: PolicyLifecycleKind,
  tenantID = '',
) {
  const common = {
    api_version:
      kind.domain === 'pbac'
        ? 'authorization.platform/v1'
        : 'data-permission.platform/v1',
    kind: kind.domain === 'pbac' ? 'ActionPolicy' : 'DataPermissionPolicy',
    metadata: {
      code: 'replace-with-policy-code',
      name: '新策略',
      ...(kind.domain === 'pbac' ? { description: '' } : {}),
    },
    scope: {
      type: kind.scope,
      ...(kind.scope === 'tenant' ? { tenant_id: tenantID } : {}),
    },
  };
  return formatPolicyDocument({
    ...common,
    spec:
      kind.domain === 'pbac'
        ? {
            actions: ['read'],
            effect: 'allow',
            resource: { type: 'replace.with.resource' },
            subject: { authenticated: true },
          }
        : {
            actions: ['read'],
            condition: 'resource.id == subject.id',
            effect: 'allow',
            resource: 'replace.with.resource',
            subject: { authenticated: true },
          },
  });
}

export function defaultPolicySimulationInput(
  kind: PolicyLifecycleKind,
  document: string,
) {
  const policy = parsePolicyDocument(document);
  const scope = policy.scope as undefined | { tenant_id?: string };
  const spec = policy.spec as
    | undefined
    | { actions?: string[]; resource?: string | { type?: string } };
  const tenantID = String(scope?.tenant_id ?? '');
  const resourceType =
    typeof spec?.resource === 'string'
      ? spec.resource
      : String(spec?.resource?.type ?? '');
  const action = String(spec?.actions?.[0] ?? 'read');
  const subject = {
    authenticated: true,
    id: 'replace-with-user-id',
    membership_id: tenantID ? 'replace-with-membership-id' : '',
    roles: [],
    tenant_id: tenantID,
    type: 'user',
  };
  const resource = { tenant_id: tenantID, type: resourceType };
  if (kind.domain === 'pbac') {
    return {
      action,
      context: {
        authentication_scheme: 'jwt',
        business_day: true,
        local_hour: 10,
        operation: `${resourceType}:${action}`,
        profile: 'development',
        timezone: 'Asia/Shanghai',
        transport: 'http',
        weekday: 1,
      },
      resource,
      subject,
    };
  }
  return {
    action,
    proposed_attributes: {},
    resource,
    resource_attributes: {},
    subject,
    subject_attributes: {},
  };
}

export async function currentTenantID() {
  const tenant = await requestClient.post<{ tenant_id: string }>(
    '/tenant-context/current',
    {},
  );
  return tenant.tenant_id;
}

export function createPolicy(kind: PolicyLifecycleKind, document: string) {
  return requestClient.post(endpoints(kind).create, {
    policy: parsePolicyDocument(document),
  });
}

export function pagePolicyVersions(
  kind: PolicyLifecycleKind,
  policyID: string,
  page = 1,
  pageSize = 20,
  signal?: AbortSignal,
) {
  return requestClient.post<PolicyVersionPage>(
    endpoints(kind).versionPage,
    {
      page,
      page_size: pageSize,
      policy_id: policyID,
      statuses: [],
    },
    { signal },
  );
}

export function getPolicyVersion(
  kind: PolicyLifecycleKind,
  policyID: string,
  versionNumber: number,
  signal?: AbortSignal,
) {
  return requestClient.post<PolicyVersionRecord>(
    endpoints(kind).versionGet,
    {
      policy_id: policyID,
      version_number: versionNumber,
    },
    { signal },
  );
}

export function createPolicyVersion(
  kind: PolicyLifecycleKind,
  policy: PolicyRecord,
  document: string,
) {
  return requestClient.post<PolicyVersionRecord>(
    endpoints(kind).versionCreate,
    {
      expected_policy_version: policy.version,
      policy: parsePolicyDocument(document),
      policy_id: policy.id,
    },
  );
}

export function publishPolicyVersion(
  kind: PolicyLifecycleKind,
  policy: PolicyRecord,
  versionNumber: number,
) {
  return requestClient.post(endpoints(kind).publish, {
    expected_policy_version: policy.version,
    policy_id: policy.id,
    version_number: versionNumber,
  });
}

export function setPolicyStatus(
  kind: PolicyLifecycleKind,
  policy: PolicyRecord,
  status: 'active' | 'disabled',
) {
  return requestClient.post<PolicyRecord>(endpoints(kind).setStatus, {
    expected_policy_version: policy.version,
    policy_id: policy.id,
    status,
  });
}

export function simulatePolicy(
  kind: PolicyLifecycleKind,
  document: string,
  input: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const policy = parsePolicyDocument(document);
  return requestClient.post(
    endpoints(kind).simulate,
    kind.domain === 'pbac' ? { policy, request: input } : { ...input, policy },
    { signal },
  );
}
