import createDOMPurify from 'dompurify';

/** Sanitizes Highlight.js markup using the smallest token-rendering surface. */
export function sanitizeHighlightedCode(markup: string) {
  const purifier = createDOMPurify(window);
  const sanitized = purifier.isSupported
    ? purifier.sanitize(markup, {
        ALLOWED_ATTR: ['class'],
        ALLOWED_TAGS: ['span'],
      })
    : markup;
  const container = document.createElement('div');
  container.innerHTML = sanitized;
  const violatesAllowlist = [...container.querySelectorAll('*')].some(
    (element) =>
      element.tagName !== 'SPAN' ||
      [...element.attributes].some((attribute) => attribute.name !== 'class'),
  );
  return violatesAllowlist ? (container.textContent ?? '') : sanitized;
}
