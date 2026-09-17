import { describe, expect, it } from 'vitest';

import { normalizeQuery } from '../../src/components/foundation/query-contract';
import {
  tenantDepartmentTreeContract,
  tenantMemberPageContract,
  tenantProfilePageContract,
  tenantRolePageContract,
} from '../../src/modules/tenant/resource-contracts';

describe('tenant resource contracts', () => {
  it('uses the non-standard member command endpoints without weakening the shared CRUD lifecycle', () => {
    expect(tenantMemberPageContract.authorizationResource).toBe(
      'tenant.member',
    );
    expect(tenantMemberPageContract.table.endpoints).toMatchObject({
      create: '/tenant-members/add',
      delete: '/tenant-members/remove',
      update: '/tenant-members/status/update',
    });
    expect(tenantMemberPageContract.table.rowAuthorization).toBe(true);
  });

  it('binds the current tenant profile to tenant-scoped endpoints without exposing create', () => {
    expect(tenantProfilePageContract.authorizationResource).toBe(
      'tenant.profile',
    );
    expect(tenantProfilePageContract.queryFields).toEqual([]);
    expect(tenantProfilePageContract.table).toMatchObject({
      allowCreate: false,
      endpoints: {
        delete: '/tenants/delete',
        get: '/tenants/get',
        page: '/tenants/page',
        update: '/tenants/update',
      },
      pageSize: 1,
    });
  });

  it('maps the joined time range to the backend request fields', () => {
    const query = normalizeQuery(tenantMemberPageContract.queryFields, {
      joined_at: ['2026-01-01T00:00:00+08:00', '2026-02-01T00:00:00+08:00'],
      keyword: ' alice ',
    });
    expect(query).toEqual({
      filters: {
        joined_from: '2026-01-01T00:00:00+08:00',
        joined_to: '2026-02-01T00:00:00+08:00',
      },
      keyword: 'alice',
    });
  });

  it('binds roles and departments to their PBAC resources', () => {
    expect(tenantRolePageContract.authorizationResource).toBe('tenant.role');
    expect(tenantRolePageContract.table.rowAuthorization).toBe(true);
    expect(tenantDepartmentTreeContract.authorizationResource).toBe(
      'tenant.department',
    );
    expect(tenantDepartmentTreeContract.rowAuthorization).toBe(true);
  });
});
