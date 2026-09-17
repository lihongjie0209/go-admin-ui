import { clearApplicationContext } from '#/api/core/menu';
import { invalidateDictionaryCache } from '#/api/go';
import { invalidateScheduledJobHandlerOptions } from '#/modules/platform/scheduled-job-options';
import { invalidatePBACEditorOptions } from '#/modules/policy/pbac-editor-options';

/** Drops all frontend data derived from the current principal or tenant. */
export function clearPrincipalScopedState() {
  clearApplicationContext();
  invalidateDictionaryCache();
  invalidatePBACEditorOptions();
  invalidateScheduledJobHandlerOptions();
}
