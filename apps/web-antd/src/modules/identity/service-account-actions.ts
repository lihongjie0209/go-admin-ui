import { requestClient } from '#/api/request';

export interface SecretMutationResult {
  account: Record<string, unknown> & { id: string; version: number };
  secret: string;
}

export function createdServiceAccount(result: unknown): SecretMutationResult {
  const value = result as null | Partial<SecretMutationResult>;
  if (
    !value ||
    typeof value.secret !== 'string' ||
    !value.secret ||
    !value.account ||
    typeof value.account !== 'object'
  ) {
    throw new Error('服务账号已创建，但服务器没有返回一次性密钥');
  }
  return value as SecretMutationResult;
}

export async function rotateServiceAccountSecret(
  row: Record<string, unknown>,
): Promise<SecretMutationResult> {
  const result = await requestClient.post<SecretMutationResult>(
    '/service-accounts/secret/rotate',
    {
      id: String(row.id ?? ''),
      version: Number(row.version),
    },
  );
  return createdServiceAccount(result);
}
