import type { CapabilityRequest } from '#/api/go';
import type { TreeResourceEndpoints } from '#/api/go/tree-resource';
import type { ResourceDetailField } from '#/components/business/detail-contract';
import type { ResourceEditorField } from '#/components/business/editor-contract';
import type { GoResourceTableProps } from '#/components/business/go-resource-types';
import type { QueryField } from '#/components/foundation/query-contract';
import type { NormalizedTreeRecord } from '#/components/foundation/tree-contract';

export interface FlatResourcePageContract {
  allowDetail?: boolean;
  authorizationResource: string;
  capabilities?: CapabilityRequest[];
  detailFields: ResourceDetailField[];
  editorFields: ResourceEditorField[];
  editorInitialValues?: Record<string, unknown>;
  initialQueryValues?: Record<string, unknown>;
  onSaved?: (result: unknown, mode: 'create' | 'edit') => Promise<void> | void;
  queryFields: QueryField[];
  table: Omit<
    GoResourceTableProps,
    'authorizationResource' | 'createAction' | 'editAction'
  >;
}

export interface TreeResourcePageContract {
  authorizationResource: string;
  canDeleteNode?: (node: NormalizedTreeRecord) => boolean;
  canEditNode?: (node: NormalizedTreeRecord) => boolean;
  capabilities?: CapabilityRequest[];
  editorFields: ResourceEditorField[];
  editorInitialValues?: Record<string, unknown>;
  endpoints: TreeResourceEndpoints;
  fixedFilters?: Record<string, unknown>;
  rowAuthorization?: boolean;
  rowAuthorizationActions?: string[];
}

export function mutationCapabilities(
  authorizationResource: string,
): CapabilityRequest[] {
  return ['create', 'update', 'delete'].map((action) => ({
    action,
    key: `${authorizationResource}:${action}`,
    resource: authorizationResource,
  }));
}

export function resourcePageCapabilities(
  authorizationResource: string,
  additional: CapabilityRequest[] = [],
  includeMutations = true,
) {
  return [
    {
      action: 'read',
      key: `${authorizationResource}:read`,
      resource: authorizationResource,
    },
    {
      action: 'list',
      key: `${authorizationResource}:list`,
      resource: authorizationResource,
    },
    ...(includeMutations ? mutationCapabilities(authorizationResource) : []),
    ...additional,
  ];
}
