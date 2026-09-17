<script setup lang="ts">
import { ref } from 'vue';

import { Button, Card, InputPassword, message } from 'ant-design-vue';

import { requestClient } from '#/api/request';
import { useAuthStore } from '#/store';

const oldPassword = ref('');
const newPassword = ref('');
const confirmation = ref('');
const submitting = ref(false);
const auth = useAuthStore();
async function submit() {
  if (submitting.value) return;
  if (!oldPassword.value) return void message.warning('请输入当前密码');
  if (newPassword.value.length < 12)
    return void message.warning('密码至少需要 12 个字符');
  if (newPassword.value !== confirmation.value)
    return void message.warning('两次输入的密码不一致');
  submitting.value = true;
  try {
    await requestClient.post('/auth/password/change', {
      new_password: newPassword.value,
      old_password: oldPassword.value,
    });
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
  <Card title="修改密码" class="w-[420px]">
    <div class="mb-4 text-sm text-gray-500">
      管理员已重置密码或密码已经过期。新密码不能与近期密码重复。
    </div>
    <InputPassword
      v-model:value="oldPassword"
      class="mb-3"
      placeholder="当前密码"
      @press-enter="submit"
    />
    <InputPassword
      v-model:value="newPassword"
      class="mb-3"
      placeholder="新密码（至少 12 位，包含大小写、数字和符号）"
      @press-enter="submit"
    />
    <InputPassword
      v-model:value="confirmation"
      class="mb-4"
      placeholder="再次输入新密码"
      @press-enter="submit"
    />
    <Button type="primary" block :loading="submitting" @click="submit">
      修改密码并重新登录
    </Button>
  </Card>
</template>
