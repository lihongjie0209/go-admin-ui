import { clearApplicationContext } from '#/api/core/menu';
import { invalidateDictionaryCache } from '#/api/go';
import { invalidateScheduledJobHandlerOptions } from '#/modules/platform/scheduled-job-options';

/** Drops all frontend data derived from the current principal or tenant. */
export function clearPrincipalScopedState() {
  clearApplicationContext();
  invalidateDictionaryCache();
  invalidateScheduledJobHandlerOptions();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('go:principal-context-changed'));
  }
}
