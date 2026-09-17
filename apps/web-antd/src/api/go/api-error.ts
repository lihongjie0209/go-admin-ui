export interface ApiClientErrorDetails {
  code?: number | string;
  fieldErrors?: Record<string, string>;
  requestID?: string;
  status?: number;
}

export class ApiClientError extends Error {
  readonly code?: number | string;
  readonly fieldErrors: Record<string, string>;
  readonly requestID?: string;
  readonly status?: number;
  readonly userMessage: string;

  constructor(message: string, details: ApiClientErrorDetails = {}) {
    const requestSuffix = details.requestID
      ? `（请求 ID：${details.requestID}）`
      : '';
    super(`${message}${requestSuffix}`);
    this.name = 'ApiClientError';
    this.code = details.code;
    this.fieldErrors = details.fieldErrors ?? {};
    this.requestID = details.requestID;
    this.status = details.status;
    this.userMessage = message;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function fieldErrors(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, message]) => typeof message === 'string')
      .map(([field, message]) => [field, String(message)]),
  );
}

/**
 * Preserve native transport/cancellation errors, but turn the platform's
 * response envelope into a real Error so every component can display the
 * authoritative message and correlation ID consistently.
 */
export function normalizeApiError(error: unknown): Error {
  if (error instanceof ApiClientError) return error;

  const response =
    isRecord(error) && isRecord(error.response) ? error.response : undefined;
  const body = response && isRecord(response.data) ? response.data : undefined;
  if (body) {
    const payload = isRecord(body.body) ? body.body : {};
    const message =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : '请求失败';
    const requestID =
      typeof body.request_id === 'string' && body.request_id.trim()
        ? body.request_id.trim()
        : undefined;
    const rawCode = body.code ?? payload.code;
    const code =
      typeof rawCode === 'number' || typeof rawCode === 'string'
        ? rawCode
        : undefined;
    const status =
      typeof response?.status === 'number' ? response.status : undefined;
    return new ApiClientError(message, {
      code,
      fieldErrors: fieldErrors(payload.field_errors ?? body.field_errors),
      requestID,
      status,
    });
  }

  if (error instanceof Error) return error;
  return new Error('请求失败');
}
