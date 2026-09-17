import type { VersionedRecord } from './contracts';
import type { ResourceContract, ResourceEndpoints } from './resource';

import type { TreeRecord } from '#/components/foundation/tree-contract';

import { requestClient } from '#/api/request';

import { createResourceApi } from './resource';

export interface TreeResourceEndpoints extends ResourceEndpoints {
  tree: string;
}

export interface TreeQuery {
  filters?: Record<string, unknown>;
  keyword?: string;
  signal?: AbortSignal;
}

export interface TreeResourceContract<
  TRecord extends TreeRecord & VersionedRecord,
> extends ResourceContract<
  TRecord,
  Record<string, unknown>,
  Record<string, unknown> & VersionedRecord
> {
  endpoints: TreeResourceEndpoints;
  toTreeRequest?: (query: Omit<TreeQuery, 'signal'>) => Record<string, unknown>;
}

export function createTreeResourceApi<
  TRecord extends TreeRecord & VersionedRecord,
>(contract: TreeResourceContract<TRecord>) {
  const resource = createResourceApi<TRecord>(contract);
  return {
    ...resource,
    tree(query: TreeQuery) {
      const input = {
        filters: query.filters ?? {},
        keyword: query.keyword ?? '',
      };
      const request = contract.toTreeRequest?.(input) ?? {
        ...input.filters,
        keyword: input.keyword,
      };
      return requestClient.post<TRecord[]>(contract.endpoints.tree, request, {
        signal: query.signal,
      });
    },
  };
}
