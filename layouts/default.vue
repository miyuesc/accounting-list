<template>
  <div class="min-h-screen bg-gray-50">
    <div v-if="isAuthenticated" class="flex h-screen overflow-hidden">
      <!-- 侧边栏 -->
      <div class="w-64 bg-white shadow-md flex flex-col">
        <div class="p-5 border-b border-gray-100">
          <h1 class="text-xl font-bold text-blue-600">记账助手</h1>
          <p class="text-sm text-gray-500 mt-1">欢迎, {{ user.name }}</p>
        </div>
        <nav class="mt-6 flex-1 px-2 space-y-1">
          <NuxtLink
            v-for="(item, index) in navItems"
            :key="index"
            :to="item.to"
            :class="[
              'nav-link',
              isActiveRoute(item.to) ? 'nav-link-active' : ''
            ]"
          >
            <UIcon :name="item.icon" class="w-5 h-5 mr-3" />
            <span>{{ item.label }}</span>
            <UIcon 
              v-if="isActiveRoute(item.to)"
              name="i-heroicons-chevron-right" 
              class="ml-auto w-4 h-4" 
            />
          </NuxtLink>
        </nav>
        <div class="p-4 border-t border-gray-100">
          <UButton 
            block
            icon="i-heroicons-arrow-right-on-rectangle" 
            color="gray" 
            variant="ghost" 
            @click="logout"
            class="justify-start"
          >
            退出登录
          </UButton>
        </div>
      </div>
      
      <!-- 主要内容 -->
      <div class="flex-1 overflow-y-auto bg-gray-50">
        <header class="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h1 class="text-xl font-semibold text-gray-800">
            {{ currentPageTitle }}
          </h1>
          <div class="flex items-center space-x-4">
            <UButton 
              icon="i-heroicons-bell" 
              color="gray" 
              variant="ghost" 
              class="rounded-full w-10 h-10 p-0 flex items-center justify-center"
            />
            <div class="flex items-center">
              <span class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-2">
                {{ user.name ? user.name.charAt(0).toUpperCase() : 'U' }}
              </span>
              <span class="text-sm font-medium text-gray-700">{{ user.name }}</span>
            </div>
          </div>
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

// 检查是否为当前激活路由
const isActiveRoute = (path) => {
  return route.path.startsWith(path);
};

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