<script setup lang="ts">
import type { SelfProfileUpdate } from '#/modules/identity/self-profile';

import { onScopeDispose, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  message,
  Skeleton,
  Tag,
} from 'ant-design-vue';

import GoAccess from '#/components/foundation/GoAccess.vue';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';
import GoDateTimeText from '#/components/foundation/GoDateTimeText.vue';
import { useFrontendAction } from '#/composables/use-frontend-action';
import {
  getSelfProfile,
  updateSelfProfile,
  validateSelfProfile,
} from '#/modules/identity/self-profile';

const router = useRouter();
const userStore = useUserStore();
const runFrontendAction = useFrontendAction();
const loading = ref(true);
const saving = ref(false);
const failure = ref('');
const profile = ref<Awaited<ReturnType<typeof getSelfProfile>>>();
const form = reactive<SelfProfileUpdate>({
  display_name: '',
  email: '',
  phone: '',
  version: 0,
});
const errors = ref<ReturnType<typeof validateSelfProfile>>({});
const controller = new AbortController();
const capabilities = [
  {
    action: 'update',
    key: 'identity.profile:update',
    resource: 'identity.profile',
  },
  {
    action: 'change-password',
    key: 'identity.credential:change-password',
    resource: 'identity.credential',
  },
  {
    action: 'list',
    key: 'identity.session:list',
    resource: 'identity.session',
  },
];

function applyProfile(value: NonNullable<typeof profile.value>) {
  profile.value = value;
  form.display_name = value.display_name;
  form.email = value.email;
  form.phone = value.phone;
  form.version = value.version;
}

async function load() {
  loading.value = true;
  failure.value = '';
  try {
    applyProfile(await getSelfProfile(controller.signal));
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      failure.value =
        error instanceof Error ? error.message : '个人资料加载失败';
    }
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (saving.value) return;
  errors.value = validateSelfProfile(form);
  if (Object.keys(errors.value).length > 0) return;
  saving.value = true;
  failure.value = '';
  try {
    const updated = await runFrontendAction(
      'identity.profile:update',
      profile.value?.id ?? '',
      () =>
        updateSelfProfile({
          display_name: form.display_name.trim(),
          email: form.email.trim().toLocaleLowerCase('en-US'),
          phone: form.phone.trim(),
          version: form.version,
        }),
    );
    applyProfile(updated);
    if (userStore.userInfo) {
      userStore.setUserInfo({
        ...userStore.userInfo,
        desc: updated.email || updated.phone,
        email: updated.email,
        phone: updated.phone,
        realName: updated.display_name,
      });
    }
    message.success('个人资料已更新');
  } catch (error) {
    failure.value = error instanceof Error ? error.message : '个人资料更新失败';
  } finally {
    saving.value = false;
  }
}

void load();
onScopeDispose(() => controller.abort());
</script>

<template>
  <Page
    title="个人资料"
    description="维护账号展示信息和联系方式。用户名与账号状态由平台统一管理。"
  >
    <GoCapabilityProvider :capabilities="capabilities">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card title="基本信息">
          <Skeleton v-if="loading" active />
          <div v-else>
            <Alert
              v-if="failure"
              class="mb-5"
              :message="failure"
              show-icon
              type="error"
            />
            <Form layout="vertical">
              <FormItem label="用户名">
                <Input :value="profile?.username" disabled />
              </FormItem>
              <FormItem
                label="显示名称"
                required
                :help="errors.display_name"
                :validate-status="errors.display_name ? 'error' : undefined"
              >
                <Input v-model:value="form.display_name" :disabled="saving" />
              </FormItem>
              <FormItem
                label="邮箱"
                :help="errors.email"
                :validate-status="errors.email ? 'error' : undefined"
              >
                <Input v-model:value="form.email" :disabled="saving" />
              </FormItem>
              <FormItem
                label="手机号"
                :help="errors.phone"
                :validate-status="errors.phone ? 'error' : undefined"
              >
                <Input v-model:value="form.phone" :disabled="saving" />
              </FormItem>
              <GoAccess action="update" resource="identity.profile">
                <Button type="primary" :loading="saving" @click="save">
                  保存修改
                </Button>
              </GoAccess>
            </Form>
          </div>
        </Card>

        <div class="flex flex-col gap-4">
          <Card title="账号信息">
            <Descriptions :column="1" size="small">
              <DescriptionsItem label="状态">
                <Tag :color="profile?.status === 'active' ? 'green' : 'orange'">
                  {{ profile?.status || '—' }}
                </Tag>
              </DescriptionsItem>
              <DescriptionsItem label="最近更新">
                <GoDateTimeText :value="profile?.updated_at" />
              </DescriptionsItem>
              <DescriptionsItem label="版本">
                {{ profile?.version ?? '—' }}
              </DescriptionsItem>
            </Descriptions>
          </Card>
          <Card title="账号安全">
            <p class="mt-0 text-sm text-muted-foreground">
              定期更新密码，并检查当前账号的登录会话。
            </p>
            <div class="flex flex-wrap gap-2">
              <GoAccess action="change-password" resource="identity.credential">
                <Button @click="router.push('/auth/change-password')">
                  修改密码
                </Button>
              </GoAccess>
              <GoAccess action="list" resource="identity.session">
                <Button @click="router.push('/identity/sessions')">
                  会话管理
                </Button>
              </GoAccess>
            </div>
          </Card>
        </div>
      </div>
    </GoCapabilityProvider>
  </Page>
</template>
