import type { DynamicDictionaryItem } from './dictionary';

import { queryAllDictionaryOptions } from './dictionary';

interface CacheEntry {
  expiresAt: number;
  promise: Promise<DynamicDictionaryItem[]>;
}

const cache = new Map<string, CacheEntry>();
const cacheTTL = 60_000;

function cacheKey(dictionaryKey: string, params: Record<string, unknown>) {
  return `${dictionaryKey}:${JSON.stringify(stableValue(params))}`;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

export function loadDictionaryItems(
  dictionaryKey: string,
  params: Record<string, unknown> = {},
) {
  const key = cacheKey(dictionaryKey, params);
  const current = cache.get(key);
  if (current && current.expiresAt > Date.now()) return current.promise;
  const promise = queryAllDictionaryOptions({
    dictionary_key: dictionaryKey,
    include_disabled: true,
    params,
  })
    .then((result) => result.items)
    .catch((error) => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, { expiresAt: Date.now() + cacheTTL, promise });
  return promise;
}

export function invalidateDictionaryCache(dictionaryKey?: string) {
  if (!dictionaryKey) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${dictionaryKey}:`)) cache.delete(key);
  }
}
