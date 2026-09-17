export type LowCodeFieldType =
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'decimal'
  | 'document'
  | 'enum'
  | 'integer'
  | 'json'
  | 'string'
  | 'text';

export interface LowCodeFieldContract {
  default?: unknown;
  enum_values?: Array<{ label: string; value: string }> | string[];
  key: string;
  label: string;
  readonly?: boolean;
  required?: boolean;
  searchable?: boolean;
  sensitive?: boolean;
  sortable?: boolean;
  type: LowCodeFieldType;
  validation?: Record<string, unknown>;
}

export interface LowCodeRelationContract {
  composition: boolean;
  delete_rule: 'cascade' | 'restrict' | 'unlink';
  key: string;
  name: string;
  target_model_id: string;
  type: 'belongs_to' | 'has_many' | 'has_one' | 'many_to_many';
}

export interface LowCodeModelContract {
  fields: LowCodeFieldContract[];
  id: string;
  model_key: string;
  name: string;
  permissions: Record<string, string>;
  relations: LowCodeRelationContract[];
  version: number;
}

export type LowCodeWidget =
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'dictionary'
  | 'document'
  | 'input'
  | 'json'
  | 'number'
  | 'select'
  | 'textarea';

export interface LowCodeFieldPresentation {
  dictionary_key?: string;
  disabled?: boolean;
  hidden?: boolean;
  label?: string;
  placeholder?: string;
  readonly?: boolean;
  span?: number;
  widget?: LowCodeWidget;
}

export interface LowCodeSectionPresentation {
  fields: string[];
  key: string;
  title?: string;
}

export interface LowCodeRelationPresentation {
  columns?: string[];
  mode: 'select' | 'subform' | 'table';
  target?: LowCodePresentation;
}

export interface LowCodePresentation {
  columns?: number;
  field_options?: Record<string, LowCodeFieldPresentation>;
  fields: string[];
  kind: 'detail' | 'form' | 'list' | 'search';
  relations?: Record<string, LowCodeRelationPresentation>;
  sections?: LowCodeSectionPresentation[];
  version: 1;
}

export interface LowCodeRecordValue extends Record<string, unknown> {
  data: Record<string, unknown>;
  delete?: boolean;
  id?: string;
  relations?: Record<string, LowCodeRecordValue[]>;
  version?: number;
}
