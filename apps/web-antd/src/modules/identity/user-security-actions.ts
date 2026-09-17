import { requestClient } from '#/api/request';

const encoder = new TextEncoder();

export interface UserSecurityTarget {
  displayName: string;
  id: string;
  username: string;
}

export function validateResetPassword(password: string, confirmation: string) {
  const errors: { confirmation?: string; password?: string } = {};
  const bytes = encoder.encode(password).byteLength;
  if (bytes < 12 || bytes > 1024) {
    errors.password = '密码长度必须为 12 至 1024 字节';
  }
  if (password !== confirmation) {
    errors.confirmation = '两次输入的密码不一致';
  }
  return errors;
}

export async function resetUserPassword(userID: string, password: string) {
  await requestClient.post('/auth/password/reset', {
    password,
    user_id: userID,
  });
}

export async function changeOwnPassword(
  oldPassword: string,
  newPassword: string,
) {
  await requestClient.post('/auth/password/change', {
    new_password: newPassword,
    old_password: oldPassword,
  });
}

export async function forceLogoutUser(row: Record<string, unknown>) {
  await requestClient.post('/auth/sessions/force-logout-all', {
    user_id: String(row.id ?? ''),
  });
}
