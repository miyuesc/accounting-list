<template>
  <div class="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
    <h1 class="text-2xl font-bold text-center mb-6">登录记账助手</h1>
    
    <UForm :state="formState" class="space-y-4" @submit="handleLogin">
      <UFormGroup label="用户名" name="username">
        <UInput v-model="formState.username" placeholder="请输入用户名" />
      </UFormGroup>
      
      <UFormGroup label="密码" name="password">
        <UInput
          v-model="formState.password"
          type="password"
          placeholder="请输入密码"
        />
      </UFormGroup>
      
      <div class="pt-4">
        <UButton
          type="submit"
          color="primary"
          block
          :loading="isLoading"
        >
          登录
        </UButton>
      </div>
      
      <div class="text-center mt-4">
        <p class="text-sm text-gray-600">
          还没有账号？
          <NuxtLink to="/register" class="text-blue-600 hover:underline">
            立即注册
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
      :discreption="errorMessage"
    >
    </UAlert>
  </div>
</template>

<script setup>
const isAuthenticated = useState('isAuthenticated');
const user = useState('user');
const router = useRouter();

// 表单状态
const formState = ref({
  username: '',
  password: '',
});

const isLoading = ref(false);
const errorMessage = ref('');

// 处理登录
const handleLogin = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    
    // 调用登录API
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: formState.value,
    });
    
    if (response.token && response.user) {
      // 保存token和用户信息
      if (process.client) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      // 更新状态
      isAuthenticated.value = true;
      user.value = response.user;
      
      // 跳转到主页
      router.push('/transactions');
    } else {
      throw new Error('登录失败，请重试');
    }
  } catch (error) {
    console.error('登录错误:', error);
    errorMessage.value = error.data?.statusMessage || '登录失败，请检查用户名和密码';
  } finally {
    isLoading.value = false;
  }
};

// 如果已经登录，直接跳转到主页
onMounted(() => {
  if (isAuthenticated.value) {
    router.push('/transactions');
  }
});
</script> 