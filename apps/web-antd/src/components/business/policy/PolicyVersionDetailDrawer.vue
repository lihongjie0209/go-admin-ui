<script setup lang="ts">
import type { PolicyVersionRecord } from '#/modules/policy/lifecycle-api';

import { computed } from 'vue';

import {
  Descriptions,
  DescriptionsItem,
  Drawer,
  Input,
  Tag,
} from 'ant-design-vue';

import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';

const props = defineProps<{
  open: boolean;
  record?: PolicyVersionRecord;
}>();

defineEmits<{ 'update:open': [value: boolean] }>();

const statusPresentation: Record<string, { color: string; label: string }> = {
  archived: { color: 'default', label: '已归档' },
  draft: { color: 'blue', label: '草稿' },
  published: { color: 'green', label: '已发布' },
};
const status = computed(() => {
  const value = props.record?.status;
  return (
    statusPresentation[value ?? ''] ?? {
      color: 'default',
      label: String(value ?? '—'),
    }
  );
});
</script>

<template>
  <Drawer
    :open="open"
    :title="record ? `策略版本 v${record.version_number}` : '策略版本详情'"
    :width="800"
    @close="$emit('update:open', false)"
  >
    <Descriptions v-if="record" bordered :column="2" size="small">
      <DescriptionsItem label="版本号">
        v{{ record.version_number }}
      </DescriptionsItem>
      <DescriptionsItem label="状态">
        <Tag :color="status.color">{{ status.label }}</Tag>
      </DescriptionsItem>
      <DescriptionsItem label="创建人">
        {{ record.created_by || '—' }}
      </DescriptionsItem>
      <DescriptionsItem label="创建时间">
        <GoDateTimeText :value="record.created_at" />
      </DescriptionsItem>
      <DescriptionsItem label="发布人">
        {{ record.published_by || '—' }}
      </DescriptionsItem>
      <DescriptionsItem label="发布时间">
        <GoDateTimeText :value="record.published_at" />
      </DescriptionsItem>
    </Descriptions>
    <div v-if="record" class="mt-4">
      <div class="mb-2 font-medium">不可变策略文档</div>
      <Input.TextArea
        class="font-mono"
        :rows="26"
        readonly
        :value="record.document"
      />
    </div>
  </Drawer>
</template>
