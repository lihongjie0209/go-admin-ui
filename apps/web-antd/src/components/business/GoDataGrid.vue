<script setup lang="ts">
import type { TableColumnType } from 'ant-design-vue';

import type {
  GoDataGridProps,
  GridBatchAction,
  GridRowAction,
} from './go-data-grid-types';

import { computed, h, onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  message,
  Popconfirm,
  Space,
  Table,
} from 'ant-design-vue';

import { errorMessage } from '#/components/foundation/error-presentation';
import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';
import GoEntityReference from '#/components/foundation/GoEntityReference.vue';
import GoPagination from '#/components/foundation/GoPagination.vue';
import GoStatusTag from '#/components/foundation/GoStatusTag.vue';

import { gridCellText } from './go-data-grid-types';

const props = withDefaults(defineProps<GoDataGridProps>(), {
  allowCreate: true,
  batchActions: () => [],
  canEdit: () => true,
  canRemove: () => true,
  createAction: undefined,
  editAction: undefined,
  enabled: true,
  pageSize: 20,
  remove: undefined,
  rowActions: () => [],
});

const rows = ref<Record<string, unknown>[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(props.pageSize);
const loading = ref(false);
const loadError = ref<unknown>();
const selectedKeys = ref<string[]>([]);
const actionLoading = ref('');
let generation = 0;

const columns = computed<TableColumnType[]>(() =>
  (props.columns ?? []).map((column) => {
    const result: TableColumnType = {
      ...column,
      dataIndex: column.field,
      key: column.field,
    };
    if (column.field !== 'action') {
      result.customRender = ({ record, text }) => {
        if (column.presentation === 'datetime')
          return h(GoDateTimeText, {
            value: text === undefined || text === null ? null : String(text),
          });
        if (column.presentation === 'status')
          return h(GoStatusTag, {
            label: column.displayField
              ? String(record[column.displayField] ?? '')
              : undefined,
            value: String(text ?? ''),
          });
        if (column.presentation === 'reference') {
          const reference =
            text && typeof text === 'object'
              ? (text as { id?: unknown; name?: unknown })
              : undefined;
          return h(GoEntityReference, {
            id: String(reference?.id ?? text ?? ''),
            name: column.displayField
              ? String(record[column.displayField] ?? '')
              : String(reference?.name ?? ''),
          });
        }
        return column.format ? column.format(text, record) : gridCellText(text);
      };
    }
    return result;
  }),
);
const selectedRows = computed(() => {
  const selected = new Set(selectedKeys.value);
  return rows.value.filter((row) => selected.has(String(row.id)));
});

async function load(resetPage = false) {
  if (!props.enabled) return;
  const current = ++generation;
  if (resetPage) page.value = 1;
  loading.value = true;
  loadError.value = undefined;
  try {
    const result = await props.dataProvider({
      filters: {},
      page: page.value,
      pageSize: pageSize.value,
    });
    if (current !== generation) return;
    rows.value = result.items;
    total.value = result.total;
    selectedKeys.value = selectedKeys.value.filter((key) =>
      rows.value.some((row) => String(row.id) === key),
    );
  } catch (error) {
    if (
      current === generation &&
      !(error instanceof DOMException && error.name === 'AbortError')
    ) {
      rows.value = [];
      total.value = 0;
      loadError.value = error;
    }
  } finally {
    if (current === generation) loading.value = false;
  }
}

function changePage(value: { page: number; page_size: number }) {
  page.value = value.page;
  pageSize.value = value.page_size;
  void load();
}

async function removeRow(row: Record<string, unknown>) {
  if (!props.remove || !props.canRemove(row) || actionLoading.value) return;
  const key = `delete:${String(row.id)}`;
  actionLoading.value = key;
  try {
    await props.remove(row);
    message.success('删除成功');
    await load(rows.value.length === 1 && page.value > 1);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败');
  } finally {
    if (actionLoading.value === key) actionLoading.value = '';
  }
}

async function runRowAction(
  action: GridRowAction,
  row: Record<string, unknown>,
) {
  if (actionLoading.value) return;
  const key = `${action.key}:${String(row.id)}`;
  actionLoading.value = key;
  try {
    await action.run(row);
    if (!action.deferred) {
      if (action.successMessage !== false)
        message.success(action.successMessage || '操作成功');
      await load();
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '操作失败');
  } finally {
    if (actionLoading.value === key) actionLoading.value = '';
  }
}

async function runBatchAction(action: GridBatchAction) {
  if (selectedRows.value.length === 0 || actionLoading.value) return;
  const key = `batch:${action.key}`;
  actionLoading.value = key;
  try {
    await action.run(selectedRows.value);
    message.success('批量操作成功');
    selectedKeys.value = [];
    await load();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '批量操作失败');
  } finally {
    if (actionLoading.value === key) actionLoading.value = '';
  }
}

watch(
  () => props.enabled,
  (enabled) => {
    if (enabled) {
      void load(true);
      return;
    }
    generation++;
    loading.value = false;
    loadError.value = undefined;
    rows.value = [];
    total.value = 0;
    selectedKeys.value = [];
  },
  { immediate: true },
);
onScopeDispose(() => generation++);
defineExpose({
  reload: (options?: { resetPage?: boolean }) => load(options?.resetPage),
});
</script>

<template>
  <section
    class="flex min-h-0 flex-1 flex-col gap-3 rounded-md border bg-card p-4"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Space wrap>
        <Button
          v-if="allowCreate && createAction"
          aria-label="新增"
          type="primary"
          @click="createAction"
        >
          新增
        </Button>
        <template v-for="action in batchActions" :key="action.key">
          <Popconfirm
            v-if="action.confirm"
            :title="
              typeof action.confirm === 'function'
                ? action.confirm(selectedRows)
                : action.confirm
            "
            @confirm="runBatchAction(action)"
          >
            <Button
              :danger="action.danger"
              :disabled="selectedRows.length === 0"
            >
              {{ action.label }}
            </Button>
          </Popconfirm>
          <Button
            v-else
            :danger="action.danger"
            :disabled="selectedRows.length === 0"
            @click="runBatchAction(action)"
          >
            {{ action.label }}
          </Button>
        </template>
      </Space>
      <span v-if="selectedRows.length" class="text-sm text-muted-foreground"
        >已选择 {{ selectedRows.length }} 项</span
      >
    </div>

    <Alert
      v-if="loadError"
      :description="errorMessage(loadError, '数据加载失败')"
      message="数据加载失败"
      show-icon
      type="error"
    >
      <template #action>
        <Button size="small" @click="load()">重试</Button>
      </template>
    </Alert>

    <Table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="false"
      :row-key="(row: Record<string, unknown>) => String(row.id)"
      :row-selection="{
        selectedRowKeys: selectedKeys,
        onChange: (keys: Array<number | string>) =>
          (selectedKeys = keys.map(String)),
      }"
      size="middle"
    >
      <template #bodyCell="{ column, record: row }">
        <template v-if="column.key === 'action'">
          <Space :size="2" wrap>
            <Button
              v-if="editAction && canEdit(row)"
              size="small"
              type="link"
              @click="editAction(row)"
            >
              编辑
            </Button>
            <template
              v-for="action in rowActions.filter(
                (item) => !item.visible || item.visible(row),
              )"
              :key="action.key"
            >
              <Popconfirm
                v-if="action.confirm"
                :title="
                  typeof action.confirm === 'function'
                    ? action.confirm(row)
                    : action.confirm
                "
                @confirm="runRowAction(action, row)"
              >
                <Button :danger="action.danger" size="small" type="link">
                  {{ action.label }}
                </Button>
              </Popconfirm>
              <Button
                v-else
                :danger="action.danger"
                size="small"
                type="link"
                @click="runRowAction(action, row)"
              >
                {{ action.label }}
              </Button>
            </template>
            <Popconfirm
              v-if="remove && canRemove(row)"
              title="确认删除这条记录？"
              @confirm="removeRow(row)"
            >
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <GoPagination
      :page="page"
      :page-size="pageSize"
      :total="total"
      @change="changePage"
    />
  </section>
</template>
