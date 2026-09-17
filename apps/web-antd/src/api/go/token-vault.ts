const refreshTokenKey = 'go-admin.refresh-token';

export function getRefreshToken() {
  return globalThis.sessionStorage?.getItem(refreshTokenKey) ?? '';
}

export function setRefreshToken(value: string) {
  if (value) {
    globalThis.sessionStorage?.setItem(refreshTokenKey, value);
  } else {
    clearRefreshToken();
  }
}

export function clearRefreshToken() {
  globalThis.sessionStorage?.removeItem(refreshTokenKey);
}
