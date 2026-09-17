import { describe, expect, it } from 'vitest';

import { ApiClientError } from '#/api/go/api-error';

import { errorMessage } from './error-presentation';

describe('errorMessage', () => {
  it('preserves an API message and request ID', () => {
    const error = new ApiClientError('版本冲突', {
      requestID: 'request-123',
    });
    expect(errorMessage(error, '操作失败')).toBe(
      '版本冲突（请求 ID：request-123）',
    );
  });

  it('uses a safe fallback for rejected non-errors', () => {
    expect(errorMessage({ secret: 'hidden' }, '加载失败')).toBe('加载失败');
  });
});
