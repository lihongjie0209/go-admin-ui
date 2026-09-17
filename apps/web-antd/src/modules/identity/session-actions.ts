import { requestClient } from '#/api/request';

export async function revokeSession(row: Record<string, unknown>) {
  await requestClient.post('/auth/sessions/revoke', {
    session_id: String(row.id ?? ''),
    version: Number(row.version),
  });
}

export async function logoutAllSessions() {
  await requestClient.post('/auth/sessions/logout-all', {});
}
