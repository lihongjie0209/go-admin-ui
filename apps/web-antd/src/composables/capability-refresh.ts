/** Bound retries and refresh before the server-provided capability expiry. */
export function capabilityRefreshDelay(expiresAt?: string) {
  const expiry = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return 30_000;
  return Math.min(300_000, Math.max(1000, expiry - Date.now()));
}
