import type { RouteLocationNormalizedLoaded } from 'vue-router';

import { inject } from 'vue';
import { routeLocationKey } from 'vue-router';

import { trackFrontendAction } from '#/api/go';

export function createFrontendActionEvent(
  route: null | Pick<RouteLocationNormalizedLoaded, 'meta' | 'path'>,
  eventName: string,
  resourceID = '',
) {
  return {
    application_id: String(route?.meta.applicationId ?? ''),
    event_name: eventName,
    page_route: route?.path ?? '',
    resource_id: resourceID,
  };
}

export function useFrontendAction() {
  const route = inject(routeLocationKey, null);
  return <T>(
    eventName: string,
    resourceID: string,
    operation: () => Promise<T>,
  ) =>
    trackFrontendAction(
      createFrontendActionEvent(route, eventName, resourceID),
      operation,
    );
}
