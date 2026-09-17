import { beforeEach, expect, it, vi } from 'vitest';

import { clearPrincipalScopedState } from './principal-state';

const invalidators = vi.hoisted(() => ({
  application: vi.fn(),
  dictionary: vi.fn(),
  pbac: vi.fn(),
  scheduledJob: vi.fn(),
}));

vi.mock('#/api/core/menu', () => ({
  clearApplicationContext: invalidators.application,
}));
vi.mock('#/api/go', () => ({
  invalidateDictionaryCache: invalidators.dictionary,
}));
vi.mock('#/modules/policy/pbac-editor-options', () => ({
  invalidatePBACEditorOptions: invalidators.pbac,
}));
vi.mock('#/modules/platform/scheduled-job-options', () => ({
  invalidateScheduledJobHandlerOptions: invalidators.scheduledJob,
}));

beforeEach(() => {
  for (const invalidate of Object.values(invalidators)) invalidate.mockReset();
});

it('invalidates every principal- and tenant-scoped frontend cache', () => {
  clearPrincipalScopedState();

  expect(invalidators.application).toHaveBeenCalledOnce();
  expect(invalidators.dictionary).toHaveBeenCalledOnce();
  expect(invalidators.pbac).toHaveBeenCalledOnce();
  expect(invalidators.scheduledJob).toHaveBeenCalledOnce();
});
