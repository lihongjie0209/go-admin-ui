import { requestClient } from '#/api/request';

export interface ScheduledJobHandlerDefinition {
  description: string;
  key: string;
  name: string;
}

export function listScheduledJobHandlers(signal?: AbortSignal) {
  return requestClient.post<ScheduledJobHandlerDefinition[]>(
    '/scheduled-jobs/handlers/list',
    {},
    { signal },
  );
}

export function triggerScheduledJob(id: string) {
  return requestClient.post<Record<string, never>>('/scheduled-jobs/trigger', {
    id,
  });
}
