import type { PBACResourceDefinition } from '#/api/go/pbac-resources';

import { listPBACResources } from '#/api/go/pbac-resources';

const ttl = 60_000;
let cached: undefined | { expiresAt: number; value: PBACResourceDefinition[] };

async function catalog(signal: AbortSignal) {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await listPBACResources('', signal);
  cached = { expiresAt: Date.now() + ttl, value };
  return value;
}

export async function loadPBACResourceOptions(
  _values: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) {
  const definitions = await catalog(signal);
  return definitions.map((definition) => ({
    label: `${definition.name}（${definition.key}）`,
    value: definition.key,
  }));
}

export async function loadPBACActionOptions(
  values: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) {
  const resource = String(values.resource ?? '').trim();
  if (!resource) return [];
  const definitions = await catalog(signal);
  return (
    definitions.find((definition) => definition.key === resource)?.actions ?? []
  ).map((action) => ({
    label: `${action.name}（${action.key}）`,
    value: action.key,
  }));
}

export function invalidatePBACEditorOptions() {
  cached = undefined;
}
