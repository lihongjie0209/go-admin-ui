import { requestClient } from '#/api/request';

export type PBACResourceScope = 'platform' | 'principal' | 'tenant';

export interface PBACActionDefinition {
  description?: string;
  key: string;
  name: string;
}

export interface PBACResourceDefinition {
  actions: PBACActionDefinition[];
  description?: string;
  key: string;
  name: string;
  scope: PBACResourceScope;
}

export function listPBACResources(
  scope: '' | PBACResourceScope,
  signal?: AbortSignal,
) {
  return requestClient.post<PBACResourceDefinition[]>(
    '/pbac/resources/list',
    { scope },
    { signal },
  );
}

export function filterPBACResources(
  definitions: PBACResourceDefinition[],
  keyword: string,
) {
  const needle = keyword.trim().toLocaleLowerCase('zh-CN');
  if (!needle) return definitions;
  return definitions.filter((definition) =>
    [
      definition.key,
      definition.name,
      definition.description,
      ...definition.actions.flatMap((action) => [
        action.key,
        action.name,
        action.description,
      ]),
    ].some((value) =>
      String(value ?? '')
        .toLocaleLowerCase('zh-CN')
        .includes(needle),
    ),
  );
}
