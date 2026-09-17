import { describe, expect, it } from 'vitest';

import { ApiClientError, normalizeApiError } from './api-error';

describe('normalizeApiError', () => {
  it('maps a platform error envelope to an inspectable Error', () => {
    const error = normalizeApiError({
      response: {
        data: {
          code: 40_903,
          message: '数据版本已变化',
          request_id: 'request-123',
        },
        status: 409,
      },
    });

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      code: 40_903,
      message: '数据版本已变化（请求 ID：request-123）',
      name: 'ApiClientError',
      requestID: 'request-123',
      status: 409,
    });
  });

  it('maps a business-code failure returned with HTTP 200', () => {
    const error = normalizeApiError({
      response: {
        data: { code: 40_400, message: '参数不合法' },
        status: 200,
      },
    });

    expect(error).toMatchObject({
      code: 40_400,
      message: '参数不合法',
      status: 200,
    });
  });

  it('preserves cancellation and network errors', () => {
    const transportError = Object.assign(new Error('canceled'), {
      code: 'ERR_CANCELED',
    });
    expect(normalizeApiError(transportError)).toBe(transportError);
  });

  it('does not expose arbitrary rejected values', () => {
    expect(normalizeApiError({ secret: 'credential' })).toEqual(
      new Error('请求失败'),
    );
  });
});
