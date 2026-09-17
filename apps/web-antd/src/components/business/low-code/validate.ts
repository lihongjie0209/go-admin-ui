import type { LowCodeModelContract, LowCodePresentation } from './types';

const forbidden = new Set([
  'code',
  'eval',
  'fetch',
  'html',
  'request',
  'script',
  'sql',
  'url',
]);

export function validateLowCodePresentation(
  model: LowCodeModelContract,
  schema: LowCodePresentation,
): string[] {
  const errors: string[] = [];
  if (schema.version !== 1) errors.push('不支持的 UI DSL 版本');
  if (!['detail', 'form', 'list', 'search'].includes(schema.kind))
    errors.push('展示类型不正确');
  if (
    !Number.isInteger(schema.columns ?? 2) ||
    (schema.columns ?? 2) < 1 ||
    (schema.columns ?? 2) > 4
  )
    errors.push('表单列数必须为 1-4');
  const fields = new Set(model.fields.map((field) => field.key));
  for (const key of schema.fields ?? [])
    if (!fields.has(key)) errors.push(`字段不存在：${key}`);
  for (const section of schema.sections ?? [])
    for (const key of section.fields)
      if (!fields.has(key)) errors.push(`分组引用了不存在字段：${key}`);
  for (const key of Object.keys(schema.field_options ?? {}))
    if (!fields.has(key)) errors.push(`字段配置引用了不存在字段：${key}`);
  const relations = new Set(model.relations.map((relation) => relation.key));
  for (const key of Object.keys(schema.relations ?? {}))
    if (!relations.has(key)) errors.push(`关系不存在：${key}`);
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach((item) => walk(item));
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (forbidden.has(key.toLowerCase()))
        errors.push(`UI DSL 不允许属性：${key}`);
      walk(child);
    }
  };
  walk(schema);
  return [...new Set(errors)];
}
