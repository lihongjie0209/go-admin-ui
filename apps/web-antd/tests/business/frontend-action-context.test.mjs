import { describe, expect, it } from 'vitest';

import { createFrontendActionEvent } from '../../src/composables/use-frontend-action.ts';

describe('frontend action context', () => {
  it('derives bounded-cardinality route context for every mutation component', () => {
    expect(
      createFrontendActionEvent(
        {
          meta: { applicationId: 'application-1' },
          path: '/app/platform/tenants',
        },
        'tenant:assign-administrator',
        'membership-1',
      ),
    ).toEqual({
      application_id: 'application-1',
      event_name: 'tenant:assign-administrator',
      page_route: '/app/platform/tenants',
      resource_id: 'membership-1',
    });
  });

  it('fails safely to an empty route context outside a router provider', () => {
    expect(
      createFrontendActionEvent(null, 'identity.user:reset-password'),
    ).toEqual({
      application_id: '',
      event_name: 'identity.user:reset-password',
      page_route: '',
      resource_id: '',
    });
  });
});
