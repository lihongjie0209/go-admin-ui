import { expect, it } from 'vitest';

import {
  authorizationActionContract,
  authorizationResourceContract,
  platformPermissionGrantContract,
} from '../../src/modules/platform/authorization-contracts';

it('only permits manual catalog records to be edited or deleted', () => {
  for (const contract of [
    authorizationResourceContract,
    authorizationActionContract,
  ]) {
    expect(contract.table.canEditRecord({ source: 'manual' })).toBe(true);
    expect(contract.table.canDeleteRecord({ source: 'manual' })).toBe(true);
    expect(contract.table.canEditRecord({ source: 'code' })).toBe(false);
    expect(contract.table.canDeleteRecord({ source: 'code' })).toBe(false);
  }
});

it('keeps immutable catalog identity and optimistic version on update', () => {
  const current = {
    id: 'record-id',
    resource_key: 'identity.user',
    scope: 'platform',
    version: 3,
  };
  expect(
    authorizationResourceContract.table.toUpdate({ name: '新版' }, current),
  ).toMatchObject({
    id: 'record-id',
    name: '新版',
    resource_key: 'identity.user',
    scope: 'platform',
    version: 3,
  });
  expect(
    authorizationActionContract.table.toUpdate(
      { name: '新版' },
      {
        action_key: 'read',
        id: 'action-id',
        resource_id: 'resource-id',
        version: 5,
      },
    ),
  ).toMatchObject({
    action_key: 'read',
    id: 'action-id',
    resource_id: 'resource-id',
    version: 5,
  });
});

it('grants platform permissions using the global authorization resource', () => {
  expect(platformPermissionGrantContract.authorizationResource).toBe(
    'authorization.platform-grant',
  );
  expect(platformPermissionGrantContract.table.endpoints).toMatchObject({
    create: '/platform/permission-grants/create',
    delete: '/platform/permission-grants/delete',
    update: '/platform/permission-grants/update',
  });
});
