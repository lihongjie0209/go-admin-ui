<script setup lang="ts">
import type { QueryField } from './query-contract';

import { reactive, watch } from 'vue';

import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Select,
  Space,
} from 'ant-design-vue';

import GoDictionarySelect from './GoDictionarySelect.vue';
import GoDictionaryTreeSelect from './GoDictionaryTreeSelect.vue';
import { normalizeQuery } from './query-contract';

const props = withDefaults(
  defineProps<{
    fields: QueryField[];
    initialValues?: Record<string, unknown>;
    loading?: boolean;
  }>(),
  {
    initialValues: () => ({}),
    loading: false,
  },
);

const emit = defineEmits<{
  reset: [];
  submit: [query: ReturnType<typeof normalizeQuery>];
}>();

const values = reactive<Record<string, unknown>>({ ...props.initialValues });

function submit() {
  try {
    emit('submit', normalizeQuery(props.fields, values));
  } catch (error) {
    message.error(error instanceof Error ? error.message : '查询条件无效');
  }
}

function reset() {
  Object.assign(
    values,
    Object.fromEntries(Object.keys(values).map((key) => [key, undefined])),
  );
  Object.assign(values, props.initialValues);
  emit('reset');
  submit();
}

function rangeValue(key: string) {
  if (!Array.isArray(values[key])) values[key] = [undefined, undefined];
  return values[key] as unknown[];
}

function inputValue(key: string) {
  const value = values[key];
  return typeof value === 'string' ? value : undefined;
}

watch(
  () => props.initialValues,
  (next) => {
    Object.assign(
      values,
      Object.fromEntries(Object.keys(values).map((key) => [key, undefined])),
    );
    Object.assign(values, next);
  },
  { deep: true },
);

defineExpose({ reset, submit, values });
</script>

<template>
  <Form class="go-query-form" layout="inline" @finish="submit">
    <FormItem v-for="field in fields" :key="field.key" :label="field.label">
      <Input
        v-if="
          field.type === 'keyword' ||
          field.type === 'text' ||
          field.type === 'id-in'
        "
        :value="inputValue(field.key)"
        allow-clear
        :placeholder="field.placeholder"
        @press-enter="submit"
        @update:value="(value) => (values[field.key] = value)"
      />
      <GoDictionarySelect
        v-else-if="field.type === 'dictionary' && field.dictionaryKey"
        v-model:value="values[field.key] as string | string[]"
        :dictionary-key="field.dictionaryKey"
        :multiple="field.multiple"
        :params="field.params"
        :placeholder="field.placeholder"
      />
      <Select
        v-else-if="field.type === 'select' || field.type === 'boolean'"
        v-model:value="values[field.key] as any"
        allow-clear
        :mode="field.multiple ? 'multiple' : undefined"
        :options="field.options"
        :placeholder="field.placeholder"
        class="min-w-36"
      />
      <GoDictionaryTreeSelect
        v-else-if="field.type === 'dictionary-tree' && field.dictionaryKey"
        v-model:value="values[field.key] as string | string[]"
        :dictionary-key="field.dictionaryKey"
        :multiple="field.multiple"
        :params="field.params"
        :placeholder="field.placeholder"
      />
      <DatePicker.RangePicker
        v-else-if="field.type === 'date-range'"
        v-model:value="values[field.key] as any"
        show-time
      />
      <Space v-else-if="field.type === 'number-range'" compact>
        <InputNumber
          v-model:value="rangeValue(field.key)[0] as number"
          :placeholder="`${field.label}下限`"
        />
        <InputNumber
          v-model:value="rangeValue(field.key)[1] as number"
          :placeholder="`${field.label}上限`"
        />
      </Space>
    </FormItem>
    <FormItem>
      <Space>
        <Button html-type="submit" type="primary" :loading="loading">
          查询
        </Button>
        <Button :disabled="loading" @click="reset">重置</Button>
      </Space>
    </FormItem>
  </Form>
</template>
