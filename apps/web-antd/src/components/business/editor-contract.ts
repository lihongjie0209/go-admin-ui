import { API_CODE_VERSION_CONFLICT } from '#/api/go/contracts';

export type ResourceEditorMode = 'create' | 'detail' | 'edit';

export interface ResourceEditorField {
  component?:
    | 'datetime'
    | 'dictionary'
    | 'dictionary-tree'
    | 'hidden'
    | 'icon'
    | 'input'
    | 'json'
    | 'number'
    | 'password'
    | 'select'
    | 'switch'
    | 'textarea';
  createOnly?: boolean;
  defaultValue?: unknown;
  dictionaryKey?: string;
  dictionaryParams?: Record<string, unknown>;
  editOnly?: boolean;
  field: string;
  label: string;
  multiple?: boolean;
  optionLoader?: (
    values: Readonly<Record<string, unknown>>,
    signal: AbortSignal,
  ) => Promise<
    Array<{
      disabled?: boolean;
      label: string;
      value: number | string;
    }>
  >;
  optionsDependsOn?: string[];
  clearOnDependencyChange?: boolean;
  options?: Array<{
    disabled?: boolean;
    label: string;
    value: number | string;
  }>;
  placeholder?: string;
  required?: boolean;
  scopeField?: string;
  validate?: (
    value: unknown,
    values: Record<string, unknown>,
  ) => string | undefined;
}

export function prepareEditorValues(
  fields: ResourceEditorField[],
  values: Record<string, unknown>,
) {
  const prepared = { ...values };
  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (field.component !== 'json') continue;
    try {
      prepared[field.field] = JSON.parse(String(values[field.field] ?? ''));
    } catch {
      errors[field.field] = `${field.label}必须是合法 JSON`;
    }
  }
  return { errors, values: prepared };
}

export interface EditorFailure {
  fieldErrors: Record<string, string>;
  message: string;
  requestID: string;
  versionConflict: boolean;
}

export function editorFields(
  fields: ResourceEditorField[],
  mode: ResourceEditorMode,
) {
  return fields.filter((field) =>
    mode === 'create' ? !field.editOnly : !field.createOnly,
  );
}

export function initialEditorValues(
  fields: ResourceEditorField[],
  mode: ResourceEditorMode,
  record: null | Record<string, unknown>,
  initialValues: Record<string, unknown>,
) {
  const initialValue = (field: ResourceEditorField) => {
    if (mode !== 'create') return record?.[field.field];
    return Object.hasOwn(initialValues, field.field)
      ? initialValues[field.field]
      : field.defaultValue;
  };
  return Object.fromEntries(
    editorFields(fields, mode).map((field) => [
      field.field,
      initialValue(field),
    ]),
  );
}

export function validateEditorValues(
  fields: ResourceEditorField[],
  values: Record<string, unknown>,
) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.field];
    const missing =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);
    if (field.required && missing) errors[field.field] = `请填写${field.label}`;
    else {
      const error = field.validate?.(value, values);
      if (error) errors[field.field] = error;
    }
  }
  return errors;
}

export function editorFingerprint(value: Record<string, unknown>) {
  const stable = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map((value) => stable(value));
    if (!item || typeof item !== 'object') return item;
    return Object.fromEntries(
      Object.entries(item as Record<string, unknown>)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [key, stable(value)]),
    );
  };
  return JSON.stringify(stable(value));
}

export function extractEditorFailure(error: unknown): EditorFailure {
  const candidate = error as {
    code?: number | string;
    fieldErrors?: Record<string, string>;
    message?: string;
    requestID?: string;
    response?: { data?: Record<string, unknown> };
    userMessage?: string;
  };
  const data = candidate?.response?.data ?? {};
  const body =
    data.body && typeof data.body === 'object'
      ? (data.body as Record<string, unknown>)
      : {};
  const rawErrors =
    candidate.fieldErrors ?? body.field_errors ?? data.field_errors;
  const fieldErrors =
    rawErrors && typeof rawErrors === 'object'
      ? Object.fromEntries(
          Object.entries(rawErrors as Record<string, unknown>).map(
            ([key, value]) => [key, String(value)],
          ),
        )
      : {};
  const code = Number(candidate.code ?? data.code ?? body.code ?? 0);
  return {
    fieldErrors,
    message: String(
      candidate.userMessage ??
        data.message ??
        body.message ??
        candidate?.message ??
        '保存失败',
    ),
    requestID: String(
      candidate.requestID ?? data.request_id ?? body.request_id ?? '',
    ),
    versionConflict: code === API_CODE_VERSION_CONFLICT,
  };
}
