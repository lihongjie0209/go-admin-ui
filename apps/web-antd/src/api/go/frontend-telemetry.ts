import { requestClient } from '#/api/request';

export type FrontendEventType = 'button_click' | 'menu_view';

export interface FrontendEvent {
  application_id?: string;
  duration_ms?: number;
  error_code?: string;
  error_message?: string;
  event_name: string;
  event_type: FrontendEventType;
  extension?: Record<string, unknown>;
  page_route?: string;
  resource_id?: string;
  succeeded: boolean;
}

export interface NavigationTelemetryInput {
  applicationId?: unknown;
  menuId?: unknown;
  path: string;
  routeName?: unknown;
}

function bounded(value: unknown, maximum: number) {
  return String(value ?? '')
    .trim()
    .slice(0, maximum);
}

export function createNavigationTelemetryEvent(
  input: NavigationTelemetryInput,
): FrontendEvent | null {
  const applicationID = bounded(input.applicationId, 128);
  const menuID = bounded(input.menuId, 256);
  if (!applicationID || !menuID) return null;
  return {
    application_id: applicationID,
    event_name: bounded(input.routeName, 256) || menuID,
    event_type: 'menu_view',
    page_route: bounded(input.path.split(/[?#]/, 1)[0], 1024),
    resource_id: menuID,
    succeeded: true,
  };
}

export function recordFrontendEvent(event: FrontendEvent) {
  return requestClient.post<{ accepted: boolean }>(
    '/operation-logs/frontend/record',
    event,
  );
}

type FrontendEventRecorder = (event: FrontendEvent) => Promise<unknown>;

export function recordFrontendEventBestEffort(
  event: FrontendEvent,
  recorder: FrontendEventRecorder = recordFrontendEvent,
) {
  // The rejection handler is attached synchronously so telemetry failures can
  // never become unhandled rejections or alter business-operation semantics.
  try {
    return Promise.resolve(recorder(event)).then(
      () => undefined,
      () => undefined,
    );
  } catch {
    return Promise.resolve();
  }
}

export async function trackFrontendAction<T>(
  event: Omit<FrontendEvent, 'duration_ms' | 'event_type' | 'succeeded'>,
  operation: () => Promise<T>,
  recorder: FrontendEventRecorder = recordFrontendEvent,
): Promise<T> {
  const startedAt = performance.now();
  try {
    const result = await operation();
    await recordFrontendEventBestEffort(
      {
        ...event,
        duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
        event_type: 'button_click',
        succeeded: true,
      },
      recorder,
    );
    return result;
  } catch (error) {
    await recordFrontendEventBestEffort(
      {
        ...event,
        duration_ms: Math.max(0, Math.round(performance.now() - startedAt)),
        error_code: 'operation_failed',
        error_message: 'operation failed',
        event_type: 'button_click',
        succeeded: false,
      },
      recorder,
    );
    throw error;
  }
}
