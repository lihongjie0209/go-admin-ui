import { requestClient } from '#/api/request';

export interface RuntimeBuildInfo {
  build_time: string;
  commit: string;
  started_at: string;
  uptime: string;
  version: string;
}

export interface RuntimeDependency {
  latency?: string;
  status: 'disabled' | 'down' | 'up' | string;
}

export interface RuntimeHealth {
  dependencies?: Record<string, RuntimeDependency>;
  status: string;
}

export interface RuntimeStatus {
  build: RuntimeBuildInfo;
  liveness: RuntimeHealth;
  readiness: RuntimeHealth;
  ready: boolean;
}

export function getRuntimeStatus(signal?: AbortSignal) {
  return requestClient.post<RuntimeStatus>(
    '/platform/runtime/status',
    {},
    { signal },
  );
}
