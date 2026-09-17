<script setup lang="ts">
import { Descriptions, DescriptionsItem } from 'ant-design-vue';

import GoDateTimeText from './GoDateTimeText.vue';
import GoEntityReference from './GoEntityReference.vue';

defineProps<{ value: Record<string, any> }>();
</script>

<template>
  <Descriptions bordered size="small" :column="2">
    <DescriptionsItem label="创建时间">
      <GoDateTimeText :value="value.created_at" />
    </DescriptionsItem>
    <DescriptionsItem label="创建人">
      <GoEntityReference :id="value.created_by" :name="value.created_by_name" />
    </DescriptionsItem>
    <DescriptionsItem label="更新时间">
      <GoDateTimeText :value="value.updated_at" />
    </DescriptionsItem>
    <DescriptionsItem label="更新人">
      <GoEntityReference :id="value.updated_by" :name="value.updated_by_name" />
    </DescriptionsItem>
    <DescriptionsItem label="版本">{{ value.version ?? '—' }}</DescriptionsItem>
  </Descriptions>
</template>
