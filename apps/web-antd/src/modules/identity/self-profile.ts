import { requestClient } from '#/api/request';

export interface SelfProfile {
  created_at: string;
  created_by: string;
  created_by_name: string;
  display_name: string;
  email: string;
  id: string;
  phone: string;
  status: 'active' | 'closed' | 'disabled' | 'locked';
  updated_at: string;
  updated_by: string;
  updated_by_name: string;
  username: string;
  version: number;
}

export interface SelfProfileUpdate {
  display_name: string;
  email: string;
  phone: string;
  version: number;
}

export function getSelfProfile(signal?: AbortSignal) {
  return requestClient.post<SelfProfile>('/profile/get', {}, { signal });
}

export function updateSelfProfile(input: SelfProfileUpdate) {
  return requestClient.post<SelfProfile>('/profile/update', input);
}

export function validateSelfProfile(input: SelfProfileUpdate) {
  const errors: Partial<Record<'display_name' | 'email' | 'phone', string>> =
    {};
  const displayName = input.display_name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();
  if (!displayName) errors.display_name = '请输入显示名称';
  else if (displayName.length > 256)
    errors.display_name = '显示名称不能超过 256 个字符';
  if (email.length > 320) errors.email = '邮箱不能超过 320 个字符';
  if (phone.length > 64) errors.phone = '手机号不能超过 64 个字符';
  return errors;
}
