<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="isAuthenticated" class="flex h-screen overflow-hidden">
      <!-- 侧边栏 -->
      <div class="w-64 bg-white shadow-md">
        <div class="p-4 border-b">
          <h1 class="text-xl font-bold text-gray-800">记账助手</h1>
          <p class="text-sm text-gray-500">欢迎, {{ user.name }}</p>
        </div>
        <nav class="mt-4">
          <UButton
            v-for="(item, index) in navItems"
            :key="index"
            :to="item.to"
            variant="ghost"
            class="w-full justify-start mb-1 rounded-none"
            :icon="item.icon"
          >
            {{ item.label }}
          </UButton>
        </nav>
      </div>
      
      <!-- 主要内容 -->
      <div class="flex-1 overflow-y-auto">
        <header class="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 class="text-xl font-semibold text-gray-800">
            {{ currentPageTitle }}
          </h1>
          <UButton 
            icon="i-heroicons-arrow-right-on-rectangle" 
            color="gray" 
            variant="ghost" 
            @click="logout"
          >
            退出登录
          </UButton>
        </header>
        <main class="p-6">
          <slot />
        </main>
      </div>
    </div>
    
    <!-- 未认证时显示登录/注册页面 -->
    <div v-else class="h-screen flex justify-center items-center">
      <slot />
    </div>
  </div>
</template>

<script setup>
const isAuthenticated = useState('isAuthenticated', () => false);
const user = useState('user', () => ({}));
const route = useRoute();

// 导航项
const navItems = [
  { label: '交易记录', to: '/transactions', icon: 'i-heroicons-banknotes' },
  { label: '统计报表', to: '/reports', icon: 'i-heroicons-chart-bar' },
  { label: '账单类型', to: '/categories', icon: 'i-heroicons-tag' },
  { label: '基础消费', to: '/basic-expenses', icon: 'i-heroicons-home' },
  { label: '设置', to: '/settings', icon: 'i-heroicons-cog-6-tooth' },
];

// 根据当前路由获取页面标题
const currentPageTitle = computed(() => {
  const path = route.path;
  const currentNav = navItems.find(item => path.startsWith(item.to));
  return currentNav ? currentNav.label : '记账助手';
});

// 退出登录
const logout = () => {
  isAuthenticated.value = false;
  user.value = {};
  navigateTo('/login');
};

// 检查是否已登录
onMounted(() => {
  // 如果在客户端，从localStorage检查登录状态
  if (process.client) {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      isAuthenticated.value = true;
      user.value = JSON.parse(userData);
    } else if (route.path !== '/login' && route.path !== '/register') {
      navigateTo('/login');
    }
  }
});
</script> 