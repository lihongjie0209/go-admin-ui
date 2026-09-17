import { beforeEach, expect, it, vi } from 'vitest';

import {
  createPolicyVersion,
  defaultPolicyDocument,
  defaultPolicySimulationInput,
  parsePolicyDocument,
  publishPolicyVersion,
  setPolicyStatus,
  simulatePolicy,
} from '../../src/modules/policy/lifecycle-api';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const pbacGlobal = { domain: 'pbac', scope: 'global' };
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

it('生成可解析的全局操作策略与租户数据策略模板', () => {
  const action = parsePolicyDocument(defaultPolicyDocument(pbacGlobal));
  expect(action).toMatchObject({
    api_version: 'authorization.platform/v1',
    kind: 'ActionPolicy',
    scope: { type: 'global' },
    spec: {
      actions: ['read'],
      effect: 'allow',
      resource: { type: 'replace.with.resource' },
    },
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
  await createPolicyVersion(pbacGlobal, record, 'spec: {}');
  expect(api.post).toHaveBeenLastCalledWith(
    '/pbac/global-policies/versions/create',
    {
      expected_policy_version: 7,
      policy: { spec: {} },
      policy_id: 'policy-id',
    },
  );

  await publishPolicyVersion(pbacGlobal, record, 3);
  expect(api.post).toHaveBeenLastCalledWith('/pbac/global-policies/publish', {
    expected_policy_version: 7,
    policy_id: 'policy-id',
    version_number: 3,
  });

  await setPolicyStatus(pbacGlobal, record, 'disabled');
  expect(api.post).toHaveBeenLastCalledWith(
    '/pbac/global-policies/status/set',
    {
      expected_policy_version: 7,
      policy_id: 'policy-id',
      status: 'disabled',
    },
  );
});

it('操作策略和数据权限策略使用不同的模拟请求契约并传递取消信号', async () => {
  const signal = new AbortController().signal;
  const input = { action: 'read', resource: { type: 'member' } };

  await simulatePolicy(pbacGlobal, 'spec: {}', input, signal);
  expect(api.post).toHaveBeenLastCalledWith(
    '/pbac/global-policies/simulate',
    { policy: { spec: {} }, request: input },
    { signal },
  );

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
