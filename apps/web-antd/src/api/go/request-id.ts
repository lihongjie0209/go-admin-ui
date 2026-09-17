interface MutableRequestHeaders {
  get(name: string): unknown;
  set(name: string, value: string): unknown;
}

export function ensureRequestID(
  headers: MutableRequestHeaders,
  generate: () => string = () => globalThis.crypto.randomUUID(),
) {
  const existing = headers.get('X-Request-ID');
  if (typeof existing === 'string' && existing.trim()) return existing.trim();

  const requestID = generate();
  headers.set('X-Request-ID', requestID);
  return requestID;
}
