import { defineConfig } from '@vben/oxfmt-config';

export default defineConfig({
  ignorePatterns: [
    'dist',
    'dev-dist',
    '.local',
    '.claude',
    '.agent',
    '.agents',
    '.codex',
    '.output.js',
    'node_modules',
    '.nvmrc',
    'coverage',
    '.backend-contract',
    'CODEOWNERS',
    '.nitro',
    '.output',
    '**/*.svg',
    '**/*.sh',
    'public',
    '**/dummy-non-existing-folder/file-viewer',
    '.npmrc',
    '*-lock.yaml',
    'skills-lock.json',
  ],
});
