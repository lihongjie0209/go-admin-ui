export function applyRequestContentType(
  headers: Record<string, unknown>,
  body: unknown,
) {
  if (body instanceof FormData) {
    delete headers['Content-Type'];
    return;
  }
  headers['Content-Type'] = 'application/json';
}
