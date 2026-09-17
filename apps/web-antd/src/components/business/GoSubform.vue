<script setup lang="ts">
import { computed } from 'vue';

import { Button, Empty } from 'ant-design-vue';

type Row = Record<string, unknown>;
interface GoSubformColumn {
  key: string;
  title: string;
  width?: number | string;
}

const props = withDefaults(
  defineProps<{
    addText?: string;
    createRow?: () => Row;
    columns?: GoSubformColumn[];
    disabled?: boolean;
    isRowHidden?: (row: Row) => boolean;
    maxRows?: number;
    minRows?: number;
    mode?: 'card' | 'table';
    readonly?: boolean;
    removeRow?: (row: Row) => null | Row;
    removeText?: string;
    title?: string;
    validateRow?: (row: Row, index: number) => string[];
    value: Row[];
  }>(),
  {
    addText: '添加一行',
    columns: () => [],
    createRow: () => ({}),
    isRowHidden: () => false,
    maxRows: 200,
    minRows: 0,
    mode: 'card',
    removeRow: () => null,
    removeText: '移除',
    title: '',
    validateRow: () => [],
  },
);

const emit = defineEmits<{
  add: [row: Row, index: number];
  remove: [row: Row, index: number];
  'update:value': [value: Row[]];
}>();

const locked = computed(() => Boolean(props.disabled || props.readonly));
const visibleRows = computed(() =>
  props.value
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .filter(({ row }) => !props.isRowHidden(row)),
);
const canAdd = computed(
  () => !locked.value && visibleRows.value.length < props.maxRows,
);
const canRemove = computed(
  () => !locked.value && visibleRows.value.length > props.minRows,
);
const rowErrors = computed(
  () =>
    new Map(
      visibleRows.value.map(({ row, sourceIndex }, index) => [
        sourceIndex,
        props.validateRow(row, index),
      ]),
    ),
);

function validate() {
  return visibleRows.value.flatMap(({ row }, index) =>
    props
      .validateRow(row, index)
      .map((message) => `第 ${index + 1} 行：${message}`),
  );
}
defineExpose({ validate });

function add() {
  if (!canAdd.value) return;
  const row = props.createRow();
  const value = [...props.value, row];
  emit('update:value', value);
  emit('add', row, value.length - 1);
}

function update(sourceIndex: number, row: Row) {
  if (locked.value) return;
  const value = [...props.value];
  value[sourceIndex] = row;
  emit('update:value', value);
}

function remove(sourceIndex: number) {
  if (!canRemove.value) return;
  const row = props.value[sourceIndex];
  if (!row) return;
  const replacement = props.removeRow(row);
  const value = [...props.value];
  if (replacement === null) value.splice(sourceIndex, 1);
  else value[sourceIndex] = replacement;
  emit('update:value', value);
  emit('remove', row, sourceIndex);
}
</script>

<template>
  <section class="go-subform">
    <div class="go-subform-toolbar">
      <span class="go-subform-title">{{ title }}</span>
      <Button v-if="!locked" :disabled="!canAdd" size="small" @click="add">
        {{ addText }}
      </Button>
    </div>
    <Empty
      v-if="!visibleRows.length"
      :description="title ? `暂无${title}` : '暂无明细'"
    />
    <div v-else-if="mode === 'card'" class="go-subform-rows">
      <div
        v-for="({ row, sourceIndex }, displayIndex) in visibleRows"
        :key="String(row.id ?? sourceIndex)"
        class="go-subform-row"
      >
        <div class="go-subform-index">{{ displayIndex + 1 }}</div>
        <div class="go-subform-content">
          <slot
            :index="displayIndex"
            :row="row"
            :source-index="sourceIndex"
            :update="(next: Row) => update(sourceIndex, next)"
          ></slot>
          <div
            v-if="rowErrors.get(sourceIndex)?.length"
            class="go-subform-errors"
          >
            <div v-for="message in rowErrors.get(sourceIndex)" :key="message">
              第 {{ displayIndex + 1 }} 行：{{ message }}
            </div>
          </div>
        </div>
        <Button
          v-if="!locked"
          danger
          :disabled="!canRemove"
          size="small"
          @click="remove(sourceIndex)"
        >
          {{ removeText }}
        </Button>
      </div>
    </div>
    <div v-else class="go-subform-table-wrap">
      <table class="go-subform-table">
        <thead>
          <tr>
            <th class="go-subform-number">序号</th>
            <th
              v-for="column in columns"
              :key="column.key"
              :style="{
                width:
                  typeof column.width === 'number'
                    ? `${column.width}px`
                    : column.width,
              }"
            >
              {{ column.title }}
            </th>
            <th v-if="!locked" class="go-subform-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <template
            v-for="({ row, sourceIndex }, displayIndex) in visibleRows"
            :key="String(row.id ?? sourceIndex)"
          >
            <tr>
              <td class="go-subform-number">{{ displayIndex + 1 }}</td>
              <td v-for="column in columns" :key="column.key">
                <slot
                  name="cell"
                  :column="column"
                  :index="displayIndex"
                  :row="row"
                  :update="(next: Row) => update(sourceIndex, next)"
                >
                  {{ row[column.key] }}
                </slot>
              </td>
              <td v-if="!locked" class="go-subform-action">
                <Button
                  danger
                  :disabled="!canRemove"
                  size="small"
                  type="link"
                  @click="remove(sourceIndex)"
                >
                  {{ removeText }}
                </Button>
              </td>
            </tr>
            <tr
              v-if="rowErrors.get(sourceIndex)?.length"
              class="go-subform-error-row"
            >
              <td :colspan="(columns?.length || 0) + (locked ? 1 : 2)">
                <div
                  v-for="message in rowErrors.get(sourceIndex)"
                  :key="message"
                >
                  第 {{ displayIndex + 1 }} 行：{{ message }}
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.go-subform {
  padding: 10px;
  background: #fafafa;
  border: 1px solid #d9d9d9;
}

.go-subform-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;
  margin-bottom: 8px;
}

.go-subform-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2329;
}

.go-subform-rows {
  display: grid;
  gap: 8px;
}

.go-subform-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  padding: 10px;
  background: #fff;
  border: 1px solid #e5e6eb;
}

.go-subform-index {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  color: #86909c;
  background: #f2f3f5;
  border-radius: 2px;
}

.go-subform-content {
  min-width: 0;
}

.go-subform-errors {
  margin-top: 4px;
  font-size: 12px;
  line-height: 20px;
  color: #ff4d4f;
}

.go-subform-table-wrap {
  overflow-x: auto;
}

.go-subform-table {
  min-width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  background: #fff;
}

.go-subform-table th {
  height: 32px;
  font-weight: 500;
  color: #4e5969;
  text-align: left;
  background: #f2f3f5;
}

.go-subform-table td,
.go-subform-table th {
  padding: 4px 8px;
  border: 1px solid #e5e6eb;
}

.go-subform-number {
  width: 52px;
  color: #86909c;
  text-align: center !important;
}

.go-subform-action {
  width: 64px;
  text-align: center !important;
}

.go-subform-error-row td {
  font-size: 12px;
  color: #ff4d4f;
}
</style>
