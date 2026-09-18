<script setup lang="ts">
import { ref } from 'vue';

import { Button, Card, InputPassword, message } from 'ant-design-vue';

import GoAccess from '#/components/foundation/GoAccess.vue';
import GoCapabilityProvider from '#/components/foundation/GoCapabilityProvider.vue';
import { useFrontendAction } from '#/composables/use-frontend-action';
import { changeOwnPassword } from '#/modules/identity/user-security-actions';
import { useAuthStore } from '#/store';

const oldPassword = ref('');
const newPassword = ref('');
const confirmation = ref('');
const submitting = ref(false);
const auth = useAuthStore();
const runFrontendAction = useFrontendAction();
const changePasswordCapability = {
  action: 'change-password',
  key: 'identity.credential:change-password',
  resource: 'identity.credential',
};
async function submit() {
  if (submitting.value) return;
  if (!oldPassword.value) return void message.warning('请输入当前密码');
  if (newPassword.value.length < 12)
    return void message.warning('密码至少需要 12 个字符');
  if (newPassword.value !== confirmation.value)
    return void message.warning('两次输入的密码不一致');
  submitting.value = true;
  try {
    await runFrontendAction('identity.credential:change-password', '', () =>
      changeOwnPassword(oldPassword.value, newPassword.value),
    );
    message.success('密码修改成功，请重新登录');
    await auth.logout();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '密码修改失败');
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <GoCapabilityProvider :capabilities="[changePasswordCapability]">
    <GoAccess
      action="change-password"
      denied="message"
      denied-message="当前账号没有修改密码的权限"
      resource="identity.credential"
    >
      <Card class="w-[420px]" title="修改密码">
        <div class="mb-4 text-sm text-gray-500">
          管理员已重置密码或密码已经过期。新密码不能与近期密码重复。
        </div>
        <InputPassword
          v-model:value="oldPassword"
          aria-label="当前密码"
          class="mb-3"
          placeholder="当前密码"
          @press-enter="submit"
        />
        <InputPassword
          v-model:value="newPassword"
          aria-label="新密码"
          class="mb-3"
          placeholder="新密码（至少 12 位，包含大小写、数字和符号）"
          @press-enter="submit"
        />
        <InputPassword
          v-model:value="confirmation"
          aria-label="确认新密码"
          class="mb-4"
          placeholder="再次输入新密码"
          @press-enter="submit"
        />
        <Button block :loading="submitting" type="primary" @click="submit">
          修改密码并重新登录
        </Button>
      </Card>
    </GoAccess>
  </GoCapabilityProvider>
</template>
