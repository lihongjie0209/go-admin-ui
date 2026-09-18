import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { auditCoverage } from './check-api-coverage.mjs';

const sourceRoot = resolve('apps/web-antd/src');

describe('openAPI frontend coverage gate', () => {
  it('combines real source ownership with reviewed excluded paths', async () => {
    const result = await auditCoverage({
      manifest: {
        schema_version: 1,
        covered: [],
        excluded: [
          {
            path: '/live',
            reason:
              'Infrastructure consumes this endpoint as the process liveness probe.',
          },
        ],
      },
      openAPI: {
        paths: {
          '/api/v1/profile/get': {},
          '/live': {},
        },
      },
      sourceRoot,
    });

    expect(result.literal.has('/profile/get')).toBe(true);
    expect(result.uncovered).toEqual([]);
  });

  it('rejects manually asserted coverage without a production-source owner', async () => {
    await expect(
      auditCoverage({
        manifest: {
          schema_version: 1,
          covered: [
            {
              path: '/unimplemented/page',
              reason:
                'A comment must not substitute for a real frontend implementation.',
            },
          ],
          excluded: [],
        },
        openAPI: { paths: { '/api/v1/unimplemented/page': {} } },
        sourceRoot,
      }),
    ).rejects.toThrow('covered manifest entries are forbidden');
  });

  it('reports a newly introduced backend operation without an owner', async () => {
    const result = await auditCoverage({
      manifest: { schema_version: 1, covered: [], excluded: [] },
      openAPI: { paths: { '/api/v1/unowned/create': {} } },
      sourceRoot,
    });

    expect(result.uncovered).toEqual(['/unowned/create']);
  });

  it('rejects stale reviewed entries after the backend removes an operation', async () => {
    await expect(
      auditCoverage({
        manifest: {
          schema_version: 1,
          covered: [],
          excluded: [
            {
              path: '/removed/page',
              reason:
                'This entry deliberately represents a removed backend operation.',
            },
          ],
        },
        openAPI: { paths: { '/api/v1/profile/get': {} } },
        sourceRoot,
      }),
    ).rejects.toThrow('stale coverage entry');
  });
});
