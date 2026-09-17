import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultOpenAPIPath = resolve(
  repositoryRoot,
  '../go-api-template/docs/swagger.json',
);
const defaultManifestPath = resolve(
  repositoryRoot,
  'contracts/openapi-ui-coverage.json',
);
const defaultSourceRoot = resolve(repositoryRoot, 'apps/web-antd/src');
const sourceExtensions = new Set(['.mjs', '.ts', '.tsx', '.vue']);

function extension(path) {
  const index = path.lastIndexOf('.');
  return index === -1 ? '' : path.slice(index);
}

function normalizePath(path) {
  const value = String(path).trim();
  return value.startsWith('/api/v1/') ? value.slice('/api/v1'.length) : value;
}

async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await sourceFiles(path)));
    else if (sourceExtensions.has(extension(entry.name))) result.push(path);
  }
  return result;
}

export function extractLiteralAPIPaths(source) {
  const paths = new Set();
  const pattern = /(?:'|"|`)(\/(?!\/)[^'"`\s${}]*)/gu;
  for (const match of source.matchAll(pattern))
    paths.add(normalizePath(match[1]));
  return paths;
}

function validateEntries(manifest, openAPIPaths) {
  if (manifest.schema_version !== 1)
    throw new Error('coverage manifest schema_version must be 1');
  const entries = [
    ...(Array.isArray(manifest.covered) ? manifest.covered : []),
    ...(Array.isArray(manifest.excluded) ? manifest.excluded : []),
  ];
  const seen = new Set();
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry.path !== 'string' ||
      !entry.path.startsWith('/') ||
      typeof entry.reason !== 'string' ||
      entry.reason.trim().length < 12
    ) {
      throw new Error(
        'every coverage entry requires a path and concrete reason',
      );
    }
    const path = normalizePath(entry.path);
    if (seen.has(path)) throw new Error(`duplicate coverage entry: ${path}`);
    if (!openAPIPaths.has(path))
      throw new Error(`stale coverage entry is not in OpenAPI: ${path}`);
    seen.add(path);
  }
  return seen;
}

export async function auditCoverage({
  manifest,
  openAPI,
  sourceRoot = defaultSourceRoot,
}) {
  const openAPIPaths = new Set(
    Object.keys(openAPI.paths ?? {}).map((path) => normalizePath(path)),
  );
  if (openAPIPaths.size === 0) throw new Error('OpenAPI document has no paths');

  const explicit = validateEntries(manifest, openAPIPaths);
  const literal = new Map();
  for (const file of await sourceFiles(sourceRoot)) {
    const source = await readFile(file, 'utf8');
    for (const path of extractLiteralAPIPaths(source)) {
      if (!openAPIPaths.has(path)) continue;
      const owners = literal.get(path) ?? [];
      owners.push(relative(repositoryRoot, file));
      literal.set(path, owners);
    }
  }

  const uncovered = [...openAPIPaths]
    .filter((path) => !literal.has(path) && !explicit.has(path))
    .toSorted();
  return { literal, openAPIPaths, uncovered };
}

async function main() {
  const argument = process.argv.slice(2).find((value) => value !== '--');
  const openAPIPath = resolve(
    repositoryRoot,
    argument ?? process.env.GO_API_OPENAPI ?? defaultOpenAPIPath,
  );
  const [openAPI, manifest] = await Promise.all([
    readFile(openAPIPath, 'utf8').then(JSON.parse),
    readFile(defaultManifestPath, 'utf8').then(JSON.parse),
  ]);
  const result = await auditCoverage({ manifest, openAPI });
  if (result.uncovered.length > 0) {
    console.error('Backend operations missing a frontend owner or exclusion:');
    for (const path of result.uncovered) console.error(`- ${path}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `OpenAPI UI coverage verified: ${result.openAPIPaths.size} operations, ` +
      `${result.literal.size} literal frontend owners.`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
