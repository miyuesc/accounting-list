<template>
  <div class="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
    <h1 class="text-2xl font-bold text-center mb-6">注册记账助手</h1>
    
    <UForm :state="formState" class="space-y-4" @submit="handleRegister">
      <UFormGroup label="用户名" name="username">
        <UInput v-model="formState.username" placeholder="请输入用户名" />
      </UFormGroup>
      
      <UFormGroup label="姓名" name="name">
        <UInput v-model="formState.name" placeholder="请输入您的姓名" />
      </UFormGroup>
      
      <UFormGroup label="邮箱" name="email">
        <UInput v-model="formState.email" type="email" placeholder="请输入邮箱" />
      </UFormGroup>
      
      <UFormGroup label="密码" name="password">
        <UInput
          v-model="formState.password"
          type="password"
          placeholder="请输入密码，至少6位"
        />
      </UFormGroup>
      
      <div class="pt-4">
        <UButton
          type="submit"
          color="primary"
          block
          :loading="isLoading"
        >
          注册
        </UButton>
      </div>
      
      <div class="text-center mt-4">
        <p class="text-sm text-gray-600">
          已有账号？
          <NuxtLink to="/login" class="text-blue-600 hover:underline">
            前往登录
          </NuxtLink>
        </p>
      </div>
    </UForm>
    
    <UAlert
      v-if="errorMessage"
      class="mt-4"
      color="red"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
    >
      {{ errorMessage }}
    </UAlert>
    
    <UAlert
      v-if="successMessage"
      class="mt-4"
      color="green"
      variant="soft"
      icon="i-heroicons-check-circle"
    >
      {{ successMessage }}
    </UAlert>
  </div>
</template>

<script setup>
const router = useRouter();

// 表单状态
const formState = ref({
  username: '',
  name: '',
  email: '',
  password: '',
});

const isLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

// 处理注册
const handleRegister = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    
    // 调用注册API
    const response = await $fetch('/api/auth/register', {
      method: 'POST',
      body: formState.value,
    });
    
    if (response.success) {
      successMessage.value = '注册成功！正在跳转到登录页面...';
      
      // 3秒后跳转到登录页
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      throw new Error('注册失败，请重试');
    }
  } catch (error) {
    console.error('注册错误:', error);
    errorMessage.value = error.data?.statusMessage || '注册失败，请检查输入的信息';
  } finally {
    isLoading.value = false;
  }
};
</script> 