import { requestClient } from '#/api/request';

export interface DictionaryOption {
  badge?: boolean;
  color?: null | string;
  description?: string;
  icon?: null | string;
  label: string;
  value: string;
}

export interface DynamicDictionaryItem extends DictionaryOption {
  children?: DynamicDictionaryItem[];
  code: string;
  disabled: boolean;
  extension: Record<string, unknown>;
  id: string;
  label: string;
  parent_id?: null | string;
  sort_order: number;
  value: string;
}

export interface DictionaryQuery {
  codes?: string[];
  dictionary_key: string;
  ids?: string[];
  include_disabled?: boolean;
  page?: number;
  page_size?: number;
  params?: Record<string, unknown>;
  search?: string;
  values?: string[];
}

interface DictionaryResultItem {
  children?: DictionaryResultItem[];
  code: string;
  disabled: boolean;
  extension?: Record<string, unknown>;
  id: string;
  name: string;
  parent_id?: null | string;
  sort_order: number;
  value: string;
}

interface DictionaryResult {
  code: string;
  extension?: Record<string, unknown>;
  items: DictionaryResultItem[];
  name: string;
  page: number;
  page_size: number;
  total: number;
  type: 'enum' | 'tree';
}

function flatten(items: DictionaryResultItem[]): DictionaryResultItem[] {
  return items.flatMap((item) => [item, ...flatten(item.children ?? [])]);
}

function toItem(item: DictionaryResultItem): DynamicDictionaryItem {
  return {
    children: item.children?.map(toItem),
    code: item.code,
    disabled: item.disabled,
    extension: item.extension ?? {},
    id: item.id,
    label: item.name,
    parent_id: item.parent_id,
    sort_order: item.sort_order,
    value: item.value || item.id,
  };
}

export async function queryDictionary(query: DictionaryQuery) {
  const result = await requestClient.post<DictionaryResult>(
    '/public/dictionaries/query',
    {
      code: query.dictionary_key,
      codes: query.codes,
      extension: query.params ?? {},
      ids: query.ids,
      include_disabled: query.include_disabled ?? false,
      keyword: query.search ?? '',
      page: query.page ?? 1,
      page_size: query.page_size ?? 50,
      sort: [{ direction: 'asc', field: 'sort_order' }],
    },
  );
  const items =
    result.type === 'tree'
      ? flatten(result.items).map((item) => toItem(item))
      : result.items.map((item) => toItem(item));
  const requestedValues = new Set(query.values);
  return {
    dictionary_type: result.type,
    has_more: result.page * result.page_size < result.total,
    items:
      requestedValues.size > 0
        ? items.filter((item) => requestedValues.has(item.value))
        : items,
    page: result.page,
    page_size: result.page_size,
    total: result.total,
    tree_load_mode: 'full' as const,
  };
}

export async function queryAllDictionaryOptions(query: DictionaryQuery) {
  return queryDictionary({
    ...query,
    page: 1,
    page_size: query.page_size ?? 200,
  });
}

export async function getDictionaryOptions(keys: string[]) {
  const entries = await Promise.all(
    keys.map(async (key) => {
      const result = await queryAllDictionaryOptions({ dictionary_key: key });
      return [
        key,
        result.items.map((item) => ({ label: item.label, value: item.value })),
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}
