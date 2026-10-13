<script setup lang="ts">
import { Page } from '@vben/common-ui';

import { TabPane, Tabs } from 'ant-design-vue';

import {
  authorizationActionContract,
  authorizationResourceContract,
} from '#/modules/platform/authorization-contracts';
import FlatResourcePage from '#/templates/resource/FlatResourcePage.vue';
</script>

<template>
  <Page
    title="资源与动作"
    description="代码来源由服务启动时同步；手工来源可在这里维护。权限可关联一个或多个动作。"
  >
    <Tabs default-active-key="resources">
      <TabPane key="resources" tab="资源">
        <FlatResourcePage :contract="authorizationResourceContract" />
      </TabPane>
      <TabPane key="actions" tab="动作">
        <FlatResourcePage :contract="authorizationActionContract" />
      </TabPane>
    </Tabs>
  </Page>
</template>
