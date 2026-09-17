import { requestClient } from '#/api/request';

export interface EffectivePermission {
  action: string;
  id: string;
  name: string;
  permission_key: string;
  resource: string;
}

export function getEffectivePermissions(
  membershipID = '',
  signal?: AbortSignal,
) {
  return requestClient.post<EffectivePermission[]>(
    '/tenant-authorization/effective-permissions',
    { membership_id: membershipID },
    { signal },
  );
}
