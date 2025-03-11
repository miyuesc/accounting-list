<template>
  <div>
    <div class="max-w-5xl mx-auto px-4 py-12">
      <!-- 欢迎横幅 -->
      <div class="bg-gradient-to-r from-primary-600 to-primary-400 rounded-xl p-8 mb-10 text-white shadow-lg">
        <h1 class="text-3xl font-bold mb-3">记账助手</h1>
        <p class="text-xl opacity-90">轻松管理个人财务，掌握你的收支情况</p>
        
        <div class="mt-6 flex flex-wrap gap-3">
          <UButton v-if="!isLoggedIn" to="/login" color="white" variant="solid" class="text-primary-600">
            登录
          </UButton>
          <UButton v-if="!isLoggedIn" to="/register" color="white" variant="outline">
            注册账号
          </UButton>
          <UButton v-if="isLoggedIn" to="/transactions" color="white" variant="solid" class="text-primary-600">
            查看我的账单
          </UButton>
        </div>
      </div>
      
      <!-- 功能介绍 -->
      <div class="grid md:grid-cols-3 gap-6 mb-12">
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div class="text-3xl text-primary-500 mb-4 i-heroicons-document-chart-bar"></div>
          <h3 class="text-lg font-semibold mb-2">多维度记账</h3>
          <p class="text-gray-600">支持收入和支出记录，多级分类管理，轻松记录每一笔账单。</p>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div class="text-3xl text-primary-500 mb-4 i-heroicons-chart-pie"></div>
          <h3 class="text-lg font-semibold mb-2">可视化报表</h3>
          <p class="text-gray-600">按周、月、季度、年查看收支报表，直观了解你的财务状况。</p>
        </div>
        
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div class="text-3xl text-primary-500 mb-4 i-heroicons-banknotes"></div>
          <h3 class="text-lg font-semibold mb-2">基础消费管理</h3>
          <p class="text-gray-600">标记固定支出如房租水电，轻松区分基础消费与额外支出。</p>
        </div>
      </div>
      
      <!-- 应用截图或更多信息 -->
      <div class="bg-gray-50 rounded-lg p-8 mb-10">
        <h2 class="text-2xl font-semibold mb-6 text-center">如何使用记账助手</h2>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="text-center">
            <div class="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-primary-500 border border-primary-100">
              1
            </div>
            <h4 class="font-medium mb-1">注册账号</h4>
            <p class="text-sm text-gray-600">创建个人账户，开始使用所有功能</p>
          </div>
          
          <div class="text-center">
            <div class="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-primary-500 border border-primary-100">
              2
            </div>
            <h4 class="font-medium mb-1">创建分类</h4>
            <p class="text-sm text-gray-600">设置个性化的收支分类体系</p>
          </div>
          
          <div class="text-center">
            <div class="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-primary-500 border border-primary-100">
              3
            </div>
            <h4 class="font-medium mb-1">记录交易</h4>
            <p class="text-sm text-gray-600">随时添加收入和支出记录</p>
          </div>
          
          <div class="text-center">
            <div class="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-primary-500 border border-primary-100">
              4
            </div>
            <h4 class="font-medium mb-1">查看报表</h4>
            <p class="text-sm text-gray-600">分析收支情况，优化财务管理</p>
          </div>
        </div>
      </div>
      
      <!-- 快速入口 -->
      <div class="flex flex-wrap justify-center gap-4">
        <UButton v-if="isLoggedIn" to="/transactions" color="primary">
          账单列表
        </UButton>
        <UButton v-if="isLoggedIn" to="/reports" color="primary" variant="outline">
          统计报表
        </UButton>
        <UButton v-if="isLoggedIn" to="/categories" color="primary" variant="outline">
          分类管理
        </UButton>
        <UButton v-if="isLoggedIn" to="/basic-expenses" color="primary" variant="outline">
          基础消费
        </UButton>
        <UButton v-if="!isLoggedIn" to="/login" color="primary">
          立即开始
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// 检查用户是否已登录
const isLoggedIn = computed(() => {
  if (process.client) {
    return !!localStorage.getItem('token') && !!localStorage.getItem('userId');
  }
  return false;
});
</script> 