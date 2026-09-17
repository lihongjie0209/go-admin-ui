<script setup lang="ts">
import type {
  ResourceEditorField,
  ResourceEditorMode,
} from './editor-contract';

import { computed, onScopeDispose, ref, watch } from 'vue';

import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Switch,
} from 'ant-design-vue';

import GoDictionarySelect from '#/components/foundation/GoDictionarySelect.vue';
import GoDictionaryTreeSelect from '#/components/foundation/GoDictionaryTreeSelect.vue';
import { usePageCapability } from '#/composables/use-page-capabilities';

import {
  editorFields,
  editorFingerprint,
  extractEditorFailure,
  initialEditorValues,
  prepareEditorValues,
  validateEditorValues,
} from './editor-contract';
import GoIconPicker from './GoIconPicker.vue';

const props = withDefaults(
  defineProps<{
    authorizationResource: string;
    beforeDiscard?: () => boolean | Promise<boolean>;
    fields: ResourceEditorField[];
    initialValues?: Record<string, unknown>;
    mode: ResourceEditorMode;
    open: boolean;
    record?: null | Record<string, unknown>;
    submit: (
      values: Record<string, unknown>,
      snapshot: null | Record<string, unknown>,
    ) => Promise<unknown>;
    title?: string;
    width?: number;
  }>(),
  {
    beforeDiscard: undefined,
    initialValues: () => ({}),
    record: null,
    title: '',
    width: 560,
  },
);

const emit = defineEmits<{
  saved: [result: unknown];
  'update:open': [value: boolean];
}>();

const values = ref<Record<string, unknown>>({});
const baseline = ref('');
const fieldErrors = ref<Record<string, string>>({});
const failure = ref<ReturnType<typeof extractEditorFailure>>();
const saving = ref(false);
const remoteOptions = ref<Record<string, ResourceEditorField['options']>>({});
const optionFailures = ref<Record<string, string>>({});
const optionLoading = ref<Record<string, boolean>>({});
const optionFingerprints = new Map<string, string>();
const optionControllers = new Map<string, AbortController>();
let generation = 0;
let closePending = false;

const fields = computed(() => editorFields(props.fields, props.mode));
const dirty = computed(
  () => editorFingerprint(values.value) !== baseline.value,
);
const createCapability = usePageCapability({
  action: 'create',
  key: `${props.authorizationResource}:create`,
  resource: props.authorizationResource,
});
const updateCapability = usePageCapability({
  action: 'update',
  key: `${props.authorizationResource}:update`,
  resource: props.authorizationResource,
});
const allowed = computed(() =>
  props.mode === 'create'
    ? createCapability.allowed.value
    : updateCapability.allowed.value,
);
const editorTitle = computed(
  () =>
    props.title || { create: '新增', detail: '详情', edit: '编辑' }[props.mode],
);

function initialize() {
  values.value = initialEditorValues(
    props.fields,
    props.mode,
    props.record,
    props.initialValues,
  );
  for (const field of fields.value) {
    if (field.component !== 'json') continue;
    const value = values.value[field.field];
    values.value[field.field] =
      value === undefined ? '' : JSON.stringify(value, null, 2);
  }
  baseline.value = editorFingerprint(values.value);
  fieldErrors.value = {};
  failure.value = undefined;
  remoteOptions.value = {};
  optionFailures.value = {};
  optionFingerprints.clear();
  void loadRemoteOptions();
}

function optionFingerprint(field: ResourceEditorField) {
  return JSON.stringify(
    (field.optionsDependsOn ?? []).map((key) => values.value[key] ?? null),
  );
}

async function loadFieldOptions(field: ResourceEditorField) {
  if (!field.optionLoader) return;
  const fingerprint = optionFingerprint(field);
  const previous = optionFingerprints.get(field.field);
  if (previous === fingerprint) return;
  optionFingerprints.set(field.field, fingerprint);
  if (
    previous !== undefined &&
    previous !== fingerprint &&
    field.clearOnDependencyChange
  ) {
    values.value[field.field] = undefined;
  }
  optionControllers.get(field.field)?.abort();
  const controller = new AbortController();
  optionControllers.set(field.field, controller);
  optionLoading.value[field.field] = true;
  optionFailures.value[field.field] = '';
  try {
    const options = await field.optionLoader(values.value, controller.signal);
    if (!controller.signal.aborted) remoteOptions.value[field.field] = options;
  } catch (error) {
    if (!controller.signal.aborted) {
      optionFailures.value[field.field] =
        error instanceof Error ? error.message : '可选项加载失败';
    }
  } finally {
    if (!controller.signal.aborted) optionLoading.value[field.field] = false;
  }
}

async function loadRemoteOptions() {
  await Promise.all(fields.value.map((field) => loadFieldOptions(field)));
}

function dictionaryParams(field: ResourceEditorField) {
  return field.scopeField
    ? { scope_id: String(values.value[field.scopeField] ?? '') }
    : field.dictionaryParams;
}

function confirmDiscard() {
  if (props.beforeDiscard) return Promise.resolve(props.beforeDiscard());
  return new Promise<boolean>((resolve) => {
    Modal.confirm({
      cancelText: '继续编辑',
      content: '关闭后未保存的修改将丢失。',
      okText: '放弃修改',
      onCancel: () => resolve(false),
      onOk: () => resolve(true),
      title: '确认放弃修改？',
    });
  });
}

async function requestClose() {
  if (saving.value || closePending) return;
  if (props.mode === 'detail' || !dirty.value) {
    emit('update:open', false);
    return;
  }
  closePending = true;
  try {
    if (await confirmDiscard()) emit('update:open', false);
  } finally {
    closePending = false;
  }
}

async function save() {
  if (saving.value || props.mode === 'detail' || !allowed.value) return;
  fieldErrors.value = validateEditorValues(fields.value, values.value);
  failure.value = undefined;
  if (Object.keys(fieldErrors.value).length > 0) return;

  const prepared = prepareEditorValues(fields.value, values.value);
  if (Object.keys(prepared.errors).length > 0) {
    fieldErrors.value = prepared.errors;
    return;
  }

  const current = ++generation;
  // Vue state is a Proxy and cannot be passed to structuredClone directly.
  // The editor contract only accepts JSON request values, so canonical JSON is
  // also the safest point-in-time copy to hand to an asynchronous submitter.
  const submittedValues = JSON.parse(editorFingerprint(prepared.values));
  const snapshot =
    props.mode === 'edit' && props.record
      ? JSON.parse(editorFingerprint(props.record))
      : null;
  saving.value = true;
  try {
    const result = await props.submit(submittedValues, snapshot);
    if (current !== generation) return;
    baseline.value = editorFingerprint(values.value);
    message.success(props.mode === 'create' ? '新增成功' : '修改成功');
    emit('saved', result);
    emit('update:open', false);
  } catch (error) {
    if (current !== generation) return;
    failure.value = extractEditorFailure(error);
    fieldErrors.value = failure.value.fieldErrors;
  } finally {
    if (current === generation) saving.value = false;
  }
}

watch(
  [() => props.open, () => props.mode, () => props.record?.id],
  ([open]) => {
    if (open) initialize();
    else {
      for (const controller of optionControllers.values()) controller.abort();
      optionControllers.clear();
    }
  },
  { immediate: true },
);
watch(
  values,
  () => {
    if (props.open) void loadRemoteOptions();
  },
  { deep: true },
);
onScopeDispose(() => {
  generation++;
  for (const controller of optionControllers.values()) controller.abort();
});
defineExpose({ dirty, requestClose, save, values });
</script>

<template>
  <Drawer
    :closable="!saving"
    :keyboard="!saving"
    :mask-closable="false"
    :open="open"
    :title="editorTitle"
    :width="width"
    @close="requestClose"
  >
    <Alert
      v-if="failure"
      class="mb-4"
      :message="
        failure.versionConflict
          ? '数据已被其他人修改，请关闭后重新打开'
          : failure.message
      "
      show-icon
      type="error"
    >
      <template v-if="failure.requestID" #description>
        请求 ID：{{ failure.requestID }}
      </template>
    </Alert>
    <Form layout="vertical">
      <FormItem
        v-for="field in fields"
        v-show="field.component !== 'hidden'"
        :key="field.field"
        :help="fieldErrors[field.field] || optionFailures[field.field]"
        :label="field.label"
        :required="field.required"
        :validate-status="
          fieldErrors[field.field] || optionFailures[field.field]
            ? 'error'
            : undefined
        "
      >
        <Switch
          v-if="field.component === 'switch'"
          v-model:checked="values[field.field] as boolean"
          :aria-label="field.label"
          :disabled="saving || mode === 'detail'"
        />
        <GoDictionaryTreeSelect
          v-else-if="
            field.component === 'dictionary-tree' && field.dictionaryKey
          "
          v-model:value="values[field.field] as string | string[]"
          :aria-label="field.label"
          :dictionary-key="field.dictionaryKey"
          :disabled="saving || mode === 'detail'"
          :multiple="field.multiple"
          :params="dictionaryParams(field)"
          :placeholder="field.placeholder"
        />
        <GoDictionarySelect
          v-else-if="field.dictionaryKey"
          v-model:value="values[field.field] as string | string[]"
          :aria-label="field.label"
          :dictionary-key="field.dictionaryKey"
          :disabled="saving || mode === 'detail'"
          :multiple="field.multiple"
          :params="dictionaryParams(field)"
          :placeholder="field.placeholder"
        />
        <InputNumber
          v-else-if="field.component === 'number'"
          v-model:value="values[field.field] as number"
          :aria-label="field.label"
          class="w-full"
          :disabled="saving || mode === 'detail'"
          :placeholder="field.placeholder"
        />
        <GoIconPicker
          v-else-if="field.component === 'icon'"
          v-model="values[field.field] as string"
          :aria-label="field.label"
          :disabled="saving || mode === 'detail'"
          :placeholder="field.placeholder"
        />
        <DatePicker
          v-else-if="field.component === 'datetime'"
          v-model:value="values[field.field] as any"
          :aria-label="field.label"
          class="w-full"
          :disabled="saving || mode === 'detail'"
          show-time
          value-format="YYYY-MM-DDTHH:mm:ssZ"
        />
        <Select
          v-else-if="field.component === 'select'"
          v-model:value="values[field.field] as any"
          :aria-label="field.label"
          :disabled="saving || mode === 'detail'"
          :loading="optionLoading[field.field]"
          :mode="field.multiple ? 'multiple' : undefined"
          :options="remoteOptions[field.field] ?? field.options"
          :placeholder="field.placeholder"
          show-search
        />
        <Input.TextArea
          v-else-if="
            field.component === 'textarea' || field.component === 'json'
          "
          v-model:value="values[field.field] as string"
          :aria-label="field.label"
          :disabled="saving || mode === 'detail'"
          :placeholder="field.placeholder"
          :rows="field.component === 'json' ? 8 : 4"
        />
        <Input.Password
          v-else-if="field.component === 'password'"
          v-model:value="values[field.field] as string"
          :aria-label="field.label"
          autocomplete="new-password"
          :disabled="saving || mode === 'detail'"
          :placeholder="field.placeholder"
        />
        <Input
          v-else
          v-model:value="values[field.field] as string"
          :aria-label="field.label"
          :disabled="saving || mode === 'detail'"
          :placeholder="field.placeholder"
        />
      </FormItem>
    </Form>
    <template #footer>
      <div class="flex justify-end">
        <Space>
          <Button :disabled="saving" @click="requestClose">
            {{ mode === 'detail' ? '关闭' : '取消' }}
          </Button>
          <Button
            v-if="mode !== 'detail'"
            aria-label="保存"
            type="primary"
            :disabled="!allowed"
            :loading="saving"
            @click="save"
          >
            保存
          </Button>
        </Space>
      </div>
    </template>
  </Drawer>
</template>
