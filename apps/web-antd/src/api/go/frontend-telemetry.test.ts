import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createNavigationTelemetryEvent,
  recordFrontendEvent,
  recordFrontendEventBestEffort,
  trackFrontendAction,
} from './frontend-telemetry';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('#/api/request', () => ({ requestClient: { post } }));

describe('frontend telemetry', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('creates a bounded menu event only for registered application menus', () => {
    expect(
      createNavigationTelemetryEvent({
        applicationId: 'app-1',
        menuId: 'menu-1',
        path: '/app/system/users?secret=value',
        routeName: 'system_users',
      }),
    ).toEqual({
      application_id: 'app-1',
      event_name: 'system_users',
      event_type: 'menu_view',
      page_route: '/app/system/users',
      resource_id: 'menu-1',
      succeeded: true,
    });
    expect(
      createNavigationTelemetryEvent({ path: '/public', routeName: 'public' }),
    ).toBeNull();
  });

  it('posts through the shared response client', async () => {
    post.mockResolvedValue({ accepted: true });
    await recordFrontendEvent({
      event_name: 'menu-1',
      event_type: 'menu_view',
      succeeded: true,
    });
    expect(post).toHaveBeenCalledWith('/operation-logs/frontend/record', {
      event_name: 'menu-1',
      event_type: 'menu_view',
      succeeded: true,
    });
  });

  it('preserves action results and reports success', async () => {
    post.mockResolvedValue({ accepted: true });
    const result = await trackFrontendAction(
      { event_name: 'identity.user:update', resource_id: 'user-1' },
      async () => 'updated',
    );
    expect(result).toBe('updated');
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      event_type: 'button_click',
      succeeded: true,
    });
  });

  it('rethrows the original failure and reports only a redacted message', async () => {
    post.mockResolvedValue({ accepted: true });
    const failure = new Error('password=do-not-log');
    await expect(
      trackFrontendAction({ event_name: 'identity.user:update' }, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      error_code: 'operation_failed',
      error_message: 'operation failed',
      succeeded: false,
    });
    expect(JSON.stringify(post.mock.calls[0]?.[1])).not.toContain('do-not-log');
  });

  it('does not fail the business operation when telemetry rejects', async () => {
    const unavailable = vi.fn(async () => {
      throw new Error('telemetry unavailable');
    });
    await expect(
      recordFrontendEventBestEffort(
        {
          event_name: 'tenant:update',
          event_type: 'button_click',
          succeeded: true,
        },
        unavailable,
      ),
    ).resolves.toBeUndefined();
    await expect(
      trackFrontendAction(
        { event_name: 'tenant:update' },
        async () => 42,
        unavailable,
      ),
    ).resolves.toBe(42);
  });
});
