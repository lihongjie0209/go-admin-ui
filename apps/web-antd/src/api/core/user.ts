import type { UserInfo } from '@vben/types';

import { getSelfProfile } from '#/modules/identity/self-profile';

export async function getUserInfoApi(): Promise<UserInfo> {
  const result = await getSelfProfile();
  return {
    avatar: '',
    desc: result.email || result.phone,
    email: result.email,
    homePath: '/apps',
    phone: result.phone,
    realName: result.display_name,
    roles: [],
    token: '',
    userId: result.id,
    username: result.username,
  } satisfies UserInfo;
}
