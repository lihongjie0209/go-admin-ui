const refreshTokenKey = 'go-admin.refresh-token';
const passwordChangeRequiredKey = 'go-admin.password-change-required';

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

export function isPasswordChangeRequired() {
  return (
    globalThis.sessionStorage?.getItem(passwordChangeRequiredKey) === 'true'
  );
}

export function setPasswordChangeRequired(required: boolean) {
  if (required) {
    globalThis.sessionStorage?.setItem(passwordChangeRequiredKey, 'true');
  } else {
    clearPasswordChangeRequired();
  }
}

export function clearPasswordChangeRequired() {
  globalThis.sessionStorage?.removeItem(passwordChangeRequiredKey);
}
