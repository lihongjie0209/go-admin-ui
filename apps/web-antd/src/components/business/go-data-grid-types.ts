import type { CapabilityRequest } from '#/api/go';

export interface GridColumn {
  displayField?: string;
  field: string;
  fixed?: 'left' | 'right';
  format?: (value: unknown, row: Record<string, unknown>) => string;
  minWidth?: number;
  presentation?: 'boolean' | 'datetime' | 'reference' | 'status' | 'text';
  title: string;
  width?: number;
}

export interface GridRowAction {
  authorization?: CapabilityRequest;
  confirm?: ((row: Record<string, unknown>) => string) | string;
  danger?: boolean;
  deferred?: boolean;
  key: string;
  label: string;
  /** Evaluate this action for the concrete row ID using the table resource. */
  rowAuthorization?: boolean;
  run: (row: Record<string, unknown>) => Promise<void>;
  successMessage?: false | string;
  visible?: (row: Record<string, unknown>) => boolean;
}

export interface GridBatchAction {
  confirm?: ((rows: Record<string, unknown>[]) => string) | string;
  danger?: boolean;
  key: string;
  label: string;
  run: (rows: Record<string, unknown>[]) => Promise<void>;
}

export interface GoDataGridProps {
  allowCreate?: boolean;
  batchActions?: GridBatchAction[];
  canEdit?: (row: Record<string, unknown>) => boolean;
  canRemove?: (row: Record<string, unknown>) => boolean;
  columns: GridColumn[];
  createAction?: () => void;
  dataProvider: (request: {
    filters: Record<string, unknown>;
    page: number;
    pageSize: number;
  }) => Promise<{ items: Record<string, unknown>[]; total: number }>;
  editAction?: (row: Record<string, unknown>) => void;
  enabled?: boolean;
  pageSize?: number;
  remove?: (row: Record<string, unknown>) => Promise<void>;
  rowActions?: GridRowAction[];
}

export function gridCellText(value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') {
    const reference = value as { id?: unknown; name?: unknown };
    if (reference.name) return String(reference.name);
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return String(value);
}
