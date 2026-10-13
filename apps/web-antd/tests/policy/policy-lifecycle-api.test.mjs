import { beforeEach, expect, it, vi } from 'vitest';

import {
  createPolicyVersion,
  defaultPolicyDocument,
  defaultPolicySimulationInput,
  getPolicyVersion,
  parsePolicyDocument,
  publishPolicyVersion,
  setPolicyStatus,
  simulatePolicy,
} from '../../src/modules/policy/lifecycle-api';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const dataGlobal = { domain: 'data-permission', scope: 'global' };
const dataTenant = { domain: 'data-permission', scope: 'tenant' };
const record = {
  code: 'member-read',
  id: 'policy-id',
  name: '成员读取',
  scope: 'global',
  status: 'active',
  version: 7,
};

beforeEach(() => {
  api.post.mockReset();
  api.post.mockResolvedValue({});
});

it('生成可解析的全局与租户数据策略模板', () => {
  const global = parsePolicyDocument(defaultPolicyDocument(dataGlobal));
  expect(global).toMatchObject({
    api_version: 'data-permission.platform/v1',
    kind: 'DataPermissionPolicy',
    scope: { type: 'global' },
  });
  const data = parsePolicyDocument(
    defaultPolicyDocument(dataTenant, 'tenant-001'),
  );
  expect(data).toMatchObject({
    api_version: 'data-permission.platform/v1',
    kind: 'DataPermissionPolicy',
    scope: { tenant_id: 'tenant-001', type: 'tenant' },
    spec: {
      condition: 'resource.id == subject.id',
      resource: 'replace.with.resource',
    },
  });
});

it('拒绝非对象和损坏的 YAML 策略文档', () => {
  expect(() => parsePolicyDocument('plain-text')).toThrow(
    '策略文档必须是一个对象',
  );
  expect(() => parsePolicyDocument('spec: [')).toThrow(/.+/);
});

it('版本创建、发布和状态切换始终携带乐观锁版本', async () => {
  await createPolicyVersion(dataGlobal, record, 'spec: {}');
  expect(api.post).toHaveBeenLastCalledWith(
    '/data-permissions/global-policies/versions/create',
    {
      expected_policy_version: 7,
      policy: { spec: {} },
      policy_id: 'policy-id',
    },
  );

  await publishPolicyVersion(dataGlobal, record, 3);
  expect(api.post).toHaveBeenLastCalledWith(
    '/data-permissions/global-policies/publish',
    {
      expected_policy_version: 7,
      policy_id: 'policy-id',
      version_number: 3,
    },
  );

  await setPolicyStatus(dataGlobal, record, 'disabled');
  expect(api.post).toHaveBeenLastCalledWith(
    '/data-permissions/global-policies/status/set',
    {
      expected_policy_version: 7,
      policy_id: 'policy-id',
      status: 'disabled',
    },
  );
});

it('按策略和版本号读取不可变版本详情并传递取消信号', async () => {
  const signal = new AbortController().signal;

  await getPolicyVersion(dataTenant, 'policy-id', 3, signal);

  expect(api.post).toHaveBeenLastCalledWith(
    '/data-permissions/tenant-policies/versions/get',
    { policy_id: 'policy-id', version_number: 3 },
    { signal },
  );
});

it('数据权限策略模拟请求传递取消信号', async () => {
  const signal = new AbortController().signal;
  const input = { action: 'read', resource: { type: 'member' } };

  await simulatePolicy(dataTenant, 'spec: {}', input, signal);
  expect(api.post).toHaveBeenLastCalledWith(
    '/data-permissions/tenant-policies/simulate',
    { ...input, policy: { spec: {} } },
    { signal },
  );
});

it('从策略文档生成可直接编辑的模拟上下文', () => {
  const document = defaultPolicyDocument(dataTenant, 'tenant-001');
  expect(defaultPolicySimulationInput(dataTenant, document)).toMatchObject({
    action: 'read',
    proposed_attributes: {},
    resource: {
      tenant_id: 'tenant-001',
      type: 'replace.with.resource',
    },
    subject: {
      authenticated: true,
      membership_id: 'replace-with-membership-id',
      tenant_id: 'tenant-001',
      type: 'user',
    },
  });
});
