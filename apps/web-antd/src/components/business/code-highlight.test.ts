import { expect, it } from 'vitest';

import { sanitizeHighlightedCode } from './code-highlight';

it('preserves syntax tokens and removes executable markup', () => {
  const result = sanitizeHighlightedCode(
    '<span class="hljs-string" onclick="steal()">safe</span>' +
      '<img src=x onerror="steal()">' +
      '<a href="javascript:steal()">link</a>' +
      '<script>steal()</script>',
  );

  expect(result).toContain('safe');
  expect(result).toContain('link');
  expect(result).not.toMatch(/onclick|onerror|javascript:|<img|<a|<script/iu);
});
