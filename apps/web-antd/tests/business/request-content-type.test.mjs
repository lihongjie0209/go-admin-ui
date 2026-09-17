import { describe, expect, it } from 'vitest';

import { applyRequestContentType } from '../../src/api/request-content-type.ts';

describe('request content type', () => {
  it('lets the browser provide the multipart boundary for FormData', () => {
    const headers = { 'Content-Type': 'application/json' };
    applyRequestContentType(headers, new FormData());
    expect(headers).not.toHaveProperty('Content-Type');
  });

  it('uses JSON for ordinary business API requests', () => {
    const headers = {};
    applyRequestContentType(headers, { id: 'record-1' });
    expect(headers).toEqual({ 'Content-Type': 'application/json' });
  });
});
