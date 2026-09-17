import { listScheduledJobHandlers } from '#/api/go/scheduled-job';

let cached:
  | undefined
  | {
      expiresAt: number;
      value: Awaited<ReturnType<typeof listScheduledJobHandlers>>;
    };

export async function loadScheduledJobHandlerOptions(
  _values: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) {
  if (!cached || cached.expiresAt <= Date.now()) {
    cached = {
      expiresAt: Date.now() + 60_000,
      value: await listScheduledJobHandlers(signal),
    };
  }
  return cached.value.map((handler) => ({
    label: `${handler.name}（${handler.key}）`,
    value: handler.key,
  }));
}

export function invalidateScheduledJobHandlerOptions() {
  cached = undefined;
}
