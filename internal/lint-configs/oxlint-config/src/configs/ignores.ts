import type { OxlintConfig } from 'oxlint';

const ignores: OxlintConfig = {
  ignorePatterns: [
    '**/dist/**',
    '**/node_modules/**',
    'docs/**',
    'playground/public/**',
    '**/public/file-viewer/**',
    '**/dummy-non-existing-folder/file-viewer/**',
    '**/*.json',
    '**/*.md',
    '**/*.svg',
    '**/*.yaml',
    '**/*.yml',
  ],
};

export { ignores };
