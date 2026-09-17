<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { Check, Copy } from '@vben/icons';

import { Button, message, Tooltip } from 'ant-design-vue';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';

import { sanitizeHighlightedCode } from './code-highlight';

const props = withDefaults(
  defineProps<{
    code?: unknown;
    language?: Language;
    maxHeight?: number;
    showLineNumbers?: boolean;
    showToolbar?: boolean;
  }>(),
  {
    code: () => '',
    language: 'plaintext',
    maxHeight: 480,
    showLineNumbers: true,
    showToolbar: true,
  },
);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('xml', xml);

type Language = 'bash' | 'json' | 'plaintext' | 'sql' | 'xml';
const copied = ref(false);
const copying = ref(false);
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
function resetCopy() {
  generation++;
  clearTimeout(timer);
  copied.value = false;
  copying.value = false;
}
onBeforeUnmount(resetCopy);
const text = computed(() => {
  if (typeof props.code === 'string') {
    if (props.language === 'json')
      try {
        return JSON.stringify(JSON.parse(props.code), null, 2);
      } catch {
        return props.code;
      }
    return props.code;
  }
  return JSON.stringify(props.code ?? null, null, 2);
});
const lines = computed(() => text.value.split('\n'));
const highlighted = computed(() =>
  sanitizeHighlightedCode(
    hljs.highlight(text.value, { language: props.language }).value,
  ),
);
watch(text, resetCopy);
async function copy() {
  if (copying.value) return;
  const current = generation;
  copying.value = true;
  try {
    await navigator.clipboard.writeText(text.value);
    if (current !== generation) return;
    copied.value = true;
    message.success('已复制');
    clearTimeout(timer);
    timer = setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    if (current === generation)
      message.error('复制失败，请检查浏览器剪贴板权限');
  } finally {
    if (current === generation) copying.value = false;
  }
}
</script>

<template>
  <section
    class="go-code-viewer"
    :style="{ '--code-max-height': `${maxHeight}px` }"
  >
    <header v-if="showToolbar" class="go-code-toolbar">
      <span>{{ language }}</span>
      <Tooltip title="复制代码">
        <Button
          type="text"
          size="small"
          :loading="copying"
          aria-label="复制代码"
          @click="copy"
        >
          <template #icon><Check v-if="copied" /><Copy v-else /></template>
        </Button>
      </Tooltip>
    </header>
    <div class="go-code-scroll">
      <ol v-if="showLineNumbers" class="go-code-lines" aria-hidden="true">
        <li v-for="(_, index) in lines" :key="index">{{ index + 1 }}</li>
      </ol>
      <!-- Highlight.js output is constrained by the DOMPurify token allowlist. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <pre><code :class="`language-${language}`" v-html="highlighted"></code></pre>
    </div>
  </section>
</template>

<style scoped>
.go-code-viewer {
  overflow: hidden;
  color: #1f2329;
  background: #f7f8fa;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

.go-code-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 34px;
  padding: 0 6px 0 12px;
  font-size: 12px;
  color: #646a73;
  background: #fff;
  border-bottom: 1px solid hsl(var(--border));
}

.go-code-scroll {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  max-height: var(--code-max-height);
  overflow: auto;
  font:
    12px/1.65 ui-monospace,
    SFMono-Regular,
    Menlo,
    Consolas,
    monospace;
}

.go-code-lines {
  min-width: 42px;
  padding: 12px 10px;
  margin: 0;
  color: #a2a7b0;
  text-align: right;
  user-select: none;
  list-style: none;
  border-right: 1px solid #e5e6eb;
}

pre {
  min-width: max-content;
  padding: 12px 14px;
  margin: 0;
  white-space: pre;
}

:deep(.hljs-attr),
:deep(.hljs-keyword),
:deep(.hljs-selector-tag) {
  color: #7c3aed;
}

:deep(.hljs-string),
:deep(.hljs-template-variable) {
  color: #087f5b;
}

:deep(.hljs-number),
:deep(.hljs-literal) {
  color: #b45309;
}

:deep(.hljs-comment) {
  font-style: italic;
  color: #8b919a;
}

/* highlight.js owns this upstream token name. */
/* stylelint-disable selector-class-pattern */
:deep(.hljs-title),
:deep(.hljs-built_in) {
  color: #1d4ed8;
}
/* stylelint-enable selector-class-pattern */
</style>
