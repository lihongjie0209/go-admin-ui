export interface ResourceDetailField {
  dictionaryKey?: string;
  displayField?: string;
  field: string;
  format?: (value: unknown, record: Record<string, unknown>) => string;
  label: string;
  presentation?:
    | 'boolean'
    | 'datetime'
    | 'dictionary'
    | 'json'
    | 'reference'
    | 'status'
    | 'text';
  span?: 1 | 2;
}

export function detailText(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

export function detailJSON(value: unknown) {
  if (value === undefined || value === null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '—';
  }
}
