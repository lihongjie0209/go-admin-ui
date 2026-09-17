import type {
  PageRequest,
  PageResult,
  Sort,
  VersionedRecord,
} from './contracts';

import { requestClient } from '#/api/request';

export interface ResourceEndpoints {
  create: string;
  delete: string;
  get: string;
  page: string;
  update: string;
}

export interface ResourceContract<
  TRecord extends VersionedRecord,
  TCreate extends Record<string, unknown>,
  TUpdate extends Record<string, unknown> & VersionedRecord,
  TFilters extends Record<string, unknown> = Record<string, unknown>,
> {
  endpoints: ResourceEndpoints;
  mapFilters?: (filters: Record<string, unknown>) => TFilters;
  defaultSort?: Sort[];
  toCreate?: (values: Record<string, unknown>) => TCreate;
  toUpdate?: (values: Record<string, unknown>, current: TRecord) => TUpdate;
}

export function toPageRequest<TFilters extends Record<string, unknown>>(
  contract: Pick<
    ResourceContract<
      VersionedRecord,
      Record<string, unknown>,
      Record<string, unknown> & VersionedRecord,
      TFilters
    >,
    'defaultSort' | 'mapFilters'
  >,
  input: Omit<PageRequest<TFilters>, 'filters'> & {
    filters?: Record<string, unknown>;
  },
): Omit<PageRequest<TFilters>, 'filters'> & TFilters {
  const filters =
    contract.mapFilters?.(input.filters ?? {}) ?? (input.filters as TFilters);
  return {
    ...filters,
    keyword: input.keyword ?? '',
    page: input.page,
    page_size: input.page_size,
    sort: input.sort?.length ? input.sort : contract.defaultSort,
  };
}

export function createResourceApi<
  TRecord extends VersionedRecord,
  TCreate extends Record<string, unknown> = Record<string, unknown>,
  TUpdate extends Record<string, unknown> & VersionedRecord = Record<
    string,
    unknown
  > &
    VersionedRecord,
  TFilters extends Record<string, unknown> = Record<string, unknown>,
>(contract: ResourceContract<TRecord, TCreate, TUpdate, TFilters>) {
  return {
    create(values: Record<string, unknown>) {
      const request = contract.toCreate?.(values) ?? (values as TCreate);
      return requestClient.post<TRecord>(contract.endpoints.create, request);
    },
    delete(record: TRecord) {
      return requestClient.post<Record<string, never>>(
        contract.endpoints.delete,
        {
          id: record.id,
          version: record.version,
        },
      );
    },
    get(id: string, signal?: AbortSignal) {
      return requestClient.post<TRecord>(
        contract.endpoints.get,
        { id },
        { signal },
      );
    },
    page(
      input: Omit<PageRequest<TFilters>, 'filters'> & {
        filters?: Record<string, unknown>;
        signal?: AbortSignal;
      },
    ) {
      const request = toPageRequest(contract, input);
      return requestClient.post<PageResult<TRecord>>(
        contract.endpoints.page,
        request,
        { signal: input.signal },
      );
    },
    update(values: Record<string, unknown>, current: TRecord) {
      const request =
        contract.toUpdate?.(values, current) ??
        ({
          ...values,
          id: current.id,
          version: current.version,
        } as TUpdate);
      return requestClient.post<TRecord>(contract.endpoints.update, request);
    },
  };
}
