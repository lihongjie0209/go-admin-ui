import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: api }));

const { invalidateScheduledJobHandlerOptions, loadScheduledJobHandlerOptions } =
  await import('../../src/modules/platform/scheduled-job-options.ts');
const { triggerScheduledJob } =
  await import('../../src/api/go/scheduled-job.ts');

beforeEach(() => {
  api.post.mockReset();
  invalidateScheduledJobHandlerOptions();
});

describe('scheduled job APIs', () => {
  it('loads only code-registered handlers and caches the bounded catalog', async () => {
    api.post.mockResolvedValue([
      {
        description: 'sample',
        key: 'system.sample',
        name: '系统示例任务',
      },
    ]);
    const signal = new AbortController().signal;
    const expected = [
      { label: '系统示例任务（system.sample）', value: 'system.sample' },
    ];
    await expect(loadScheduledJobHandlerOptions({}, signal)).resolves.toEqual(
      expected,
    );
    await expect(loadScheduledJobHandlerOptions({}, signal)).resolves.toEqual(
      expected,
    );
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(
      '/scheduled-jobs/handlers/list',
      {},
      { signal },
    );
  });

  it('triggers one job by opaque ID without sending the record payload', async () => {
    api.post.mockResolvedValue({});
    await triggerScheduledJob('job-1');
    expect(api.post).toHaveBeenCalledWith('/scheduled-jobs/trigger', {
      id: 'job-1',
    });
  });
});
