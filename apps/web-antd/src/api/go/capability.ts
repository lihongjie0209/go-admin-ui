import { requestClient } from '#/api/request';

export interface CapabilityRequest {
  action: string;
  key: string;
  resource: string;
}

export interface CapabilityResult {
  expires_at: string;
  items: Array<{ allowed: boolean; key: string }>;
  revision: string;
}

export interface RowCapabilityResult {
  expires_at: string;
  items: Array<{ actions: Record<string, boolean>; resource_id: string }>;
  resource: string;
  revision: string;
}

export function evaluateCapabilities(items: CapabilityRequest[]) {
  return requestClient.post<CapabilityResult>(
    '/authorization/capabilities/evaluate',
    { items },
  );
}

export function evaluateRowCapabilities(
  resource: string,
  actions: string[],
  resourceIds: string[],
) {
  return requestClient.post<RowCapabilityResult>(
    '/authorization/rows/evaluate',
    {
      actions,
      resource,
      resource_ids: resourceIds,
    },
  );
}
