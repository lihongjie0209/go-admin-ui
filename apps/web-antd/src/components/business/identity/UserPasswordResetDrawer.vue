<script setup lang="ts">
import type { UserSecurityTarget } from '#/modules/identity/user-security-actions';

import { computed, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Drawer,
  Form,
  FormItem,
  Input,
  message,
  Popconfirm,
} from 'ant-design-vue';

import { usePageCapability } from '#/composables/use-page-capabilities';
import {
  resetUserPassword,
  validateResetPassword,
} from '#/modules/identity/user-security-actions';

const props = defineProps<{
  open: boolean;
  user?: UserSecurityTarget;
}>();
const emit = defineEmits<{
  saved: [];
  'update:open': [value: boolean];
}>();

const capability = usePageCapability({
  action: 'reset-password',
  key: 'identity.user:reset-password',
  resource: 'identity.user',
});
const password = ref('');
const confirmation = ref('');
const saving = ref(false);
const failure = ref('');
const errors = ref<{ confirmation?: string; password?: string }>({});
const title = computed(() =>
  props.user ? `强制重置密码 · ${props.user.displayName}` : '强制重置密码',
);

function clearSensitiveState() {
  password.value = '';
  confirmation.value = '';
  errors.value = {};
  failure.value = '';
}

function close() {
  if (saving.value) return;
  clearSensitiveState();
  emit('update:open', false);
}

async function submit() {
  if (!props.user || !capability.allowed.value || saving.value) return;
  errors.value = validateResetPassword(password.value, confirmation.value);
  if (Object.keys(errors.value).length > 0) return;
  saving.value = true;
  failure.value = '';
  try {
    await resetUserPassword(props.user.id, password.value);
    message.success('密码已重置，用户现有会话已撤销');
    clearSensitiveState();
    emit('saved');
    emit('update:open', false);
  } catch (error) {
    failure.value = error instanceof Error ? error.message : '密码重置失败';
  } finally {
    saving.value = false;
  }
}

watch(
  [() => props.open, () => props.user?.id],
  ([open]) => {
    clearSensitiveState();
    if (open && !capability.allowed.value) {
      failure.value = '当前账号没有重置用户密码的权限';
    }
  },
  { immediate: true },
);
</script>

<template>
  <Drawer
    :closable="!saving"
    :keyboard="!saving"
    :mask-closable="false"
    :open="open"
    :title="title"
    :width="480"
    @close="close"
  >
    <Alert
      class="mb-5"
      description="保存后，该用户的全部登录会话会立即失效，需要使用新密码重新登录。"
      message="这是安全敏感操作"
      show-icon
      type="warning"
    />
    <Alert
      v-if="failure"
      class="mb-5"
      :message="failure"
      show-icon
      type="error"
    />
    <Form layout="vertical">
      <FormItem
        :help="errors.password"
        label="新密码"
        required
        :validate-status="errors.password ? 'error' : undefined"
      >
        <Input.Password
          v-model:value="password"
          autocomplete="new-password"
          :disabled="saving"
          placeholder="至少 12 个字节"
        />
      </FormItem>
      <FormItem
        :help="errors.confirmation"
        label="确认新密码"
        required
        :validate-status="errors.confirmation ? 'error' : undefined"
      >
        <Input.Password
          v-model:value="confirmation"
          autocomplete="new-password"
          :disabled="saving"
          placeholder="再次输入新密码"
          @press-enter="submit"
        />
      </FormItem>
    </Form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :disabled="saving" @click="close">取消</Button>
        <Popconfirm
          title="确认重置密码并撤销该用户的全部会话？"
          @confirm="submit"
        >
          <Button
            danger
            :disabled="!capability.allowed.value"
            :loading="saving"
            type="primary"
          >
            重置密码
          </Button>
        </Popconfirm>
      </div>
    </template>
  </Drawer>
</template>
