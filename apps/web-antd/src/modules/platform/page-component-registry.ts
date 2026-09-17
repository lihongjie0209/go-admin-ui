const pageModules = import.meta.glob('../../views/**/*.vue');
const fallbackPrefix = '_core/';

export interface PageComponentOption {
  label: string;
  value: string;
}

export function normalizePageComponentID(value: string) {
  return String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\.vue$/, '');
}

const registeredComponentIDs = new Set(
  Object.keys(pageModules).map((path) =>
    path.replace('../../views/', '').replace(/\.vue$/, ''),
  ),
);

export function isRegisteredPageComponent(value: string) {
  const normalized = normalizePageComponentID(value);
  return normalized !== '' && registeredComponentIDs.has(normalized);
}

export function registeredPageComponents(): PageComponentOption[] {
  return Object.keys(pageModules)
    .map((path) => path.replace('../../views/', '').replace(/\.vue$/, ''))
    .filter((path) => !path.startsWith(fallbackPrefix))
    .toSorted()
    .map((path) => ({
      label: path.replaceAll('/', ' / '),
      value: path,
    }));
}

export async function loadPageComponentOptions(
  _values: Readonly<Record<string, unknown>>,
  signal: AbortSignal,
) {
  if (signal.aborted) throw new DOMException('aborted', 'AbortError');
  return registeredPageComponents();
}
