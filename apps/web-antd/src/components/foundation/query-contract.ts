export type QueryFieldType =
  | 'boolean'
  | 'date-range'
  | 'dictionary'
  | 'dictionary-tree'
  | 'id-in'
  | 'keyword'
  | 'number-range'
  | 'select'
  | 'text';

export interface QueryField {
  dictionaryKey?: string;
  filterKey?: string;
  fromKey?: string;
  includeDisabled?: boolean;
  key: string;
  label: string;
  maxItems?: number;
  multiple?: boolean;
  options?: Array<{
    disabled?: boolean;
    label: string;
    value: number | string;
  }>;
  params?: Record<string, unknown>;
  placeholder?: string;
  toKey?: string;
  type: QueryFieldType;
}

export interface NormalizedQuery {
  filters: Record<string, unknown>;
  keyword: string;
}

function isEmpty(value: unknown) {
  return value === undefined || value === null || value === '';
}

function list(value: unknown) {
  if (Array.isArray(value))
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(/[\s,，;；]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dateTime(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'format' in value &&
    typeof value.format === 'function'
  ) {
    return value.format('YYYY-MM-DDTHH:mm:ssZ');
  }
  return String(value);
}

export function normalizeQuery(
  fields: QueryField[],
  values: Record<string, unknown>,
): NormalizedQuery {
  const filters: Record<string, unknown> = {};
  let keyword = '';

  for (const field of fields) {
    const value = values[field.key];
    if (field.type === 'keyword') {
      keyword = typeof value === 'string' ? value.trim() : '';
      continue;
    }
    if (isEmpty(value)) continue;

    if (field.type === 'id-in') {
      const values = [...new Set(list(value))];
      const maximum = field.maxItems ?? 100;
      if (values.length > maximum)
        throw new Error(`${field.label}最多选择 ${maximum} 项`);
      if (values.length > 0) filters[field.filterKey ?? field.key] = values;
      continue;
    }

    if (field.type === 'boolean') {
      if (value === 'true' || value === true)
        filters[field.filterKey ?? field.key] = true;
      else if (value === 'false' || value === false)
        filters[field.filterKey ?? field.key] = false;
      continue;
    }

    if (field.type === 'date-range' || field.type === 'number-range') {
      if (!Array.isArray(value)) continue;
      const [from, to] = value;
      if (!isEmpty(from))
        filters[field.fromKey ?? `${field.key}_from`] =
          field.type === 'date-range' ? dateTime(from) : from;
      if (!isEmpty(to))
        filters[field.toKey ?? `${field.key}_to`] =
          field.type === 'date-range' ? dateTime(to) : to;
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) filters[field.filterKey ?? field.key] = [...value];
      continue;
    }
    filters[field.filterKey ?? field.key] =
      typeof value === 'string' ? value.trim() : value;
  }

  return { filters, keyword };
}
