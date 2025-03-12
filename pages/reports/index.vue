<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">报表统计</h2>
    </div>
    
    <!-- 过滤器 -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UFormGroup label="时间周期">
          <USelectMenu
            v-model="filters.period"
            :options="periodOptions"
            placeholder="选择统计周期"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormGroup>
        
        <!-- 根据周期动态显示不同选择器 -->
        <template v-if="filters.period === 'year'">
          <!-- 年度选择 -->
          <UFormGroup label="年份">
            <USelectMenu
              v-model="filters.year"
              :options="yearOptions"
              placeholder="选择年份"
              value-attribute="value"
              option-attribute="label"
            />
          </UFormGroup>
        </template>
        
        <template v-else-if="filters.period === 'quarter'">
          <!-- 季度选择 -->
          <UFormGroup label="年份">
            <USelectMenu
              v-model="filters.year"
              :options="yearOptions"
              placeholder="选择年份"
              value-attribute="value"
              option-attribute="label"
            />
          </UFormGroup>
          
          <UFormGroup label="季度">
            <USelectMenu
              v-model="filters.quarter"
              :options="quarterOptions"
              placeholder="选择季度"
              value-attribute="value"
              option-attribute="label"
            />
          </UFormGroup>
        </template>
        
        <template v-else-if="filters.period === 'month'">
          <!-- 月份选择 -->
          <UFormGroup label="年份">
            <USelectMenu
              v-model="filters.year"
              :options="yearOptions"
              placeholder="选择年份"
              value-attribute="value"
              option-attribute="label"
            />
          </UFormGroup>
          
          <UFormGroup label="月份">
            <USelectMenu
              v-model="filters.month"
              :options="monthOptions"
              placeholder="选择月份"
              value-attribute="value"
              option-attribute="label"
            />
          </UFormGroup>
        </template>
        
        <!-- 基础消费选项 -->
        <UFormGroup label="包含基础消费">
          <USelectMenu
            v-model="filters.includeBasicExpense"
            :options="basicExpenseOptions"
            placeholder="是否包含基础消费"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormGroup>
      </div>
      
      <div class="flex justify-end mt-4">
        <UButton color="primary" @click="loadReport">
          生成报表
        </UButton>
      </div>
    </div>
    
    <!-- 加载中 -->
    <div v-if="isLoading" class="flex justify-center py-10">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 text-primary-500" />
    </div>
    
    <!-- 报表内容 -->
    <template v-else-if="hasData">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- 收入支出总览 -->
        <div class="bg-white p-4 rounded-lg shadow-sm">
          <h3 class="text-lg font-medium mb-4">总览</h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-green-50 p-4 rounded-lg">
              <div class="text-sm text-green-600 mb-1">总收入</div>
              <div class="text-2xl font-bold text-green-700">
                {{ formatCurrency(summary.totalIncome) }}
              </div>
            </div>
            <div class="bg-red-50 p-4 rounded-lg">
              <div class="text-sm text-red-600 mb-1">总支出</div>
              <div class="text-2xl font-bold text-red-700">
                {{ formatCurrency(summary.totalExpense) }}
              </div>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg">
              <div class="text-sm text-blue-600 mb-1">结余</div>
              <div class="text-2xl font-bold" :class="summary.balance >= 0 ? 'text-blue-700' : 'text-red-700'">
                {{ formatCurrency(summary.balance) }}
              </div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg">
              <div class="text-sm text-purple-600 mb-1">交易次数</div>
              <div class="text-2xl font-bold text-purple-700">
                {{ summary.totalCount }}
              </div>
            </div>
          </div>
          
          <!-- 基础消费统计 -->
          <div class="mt-4 bg-orange-50 p-4 rounded-lg">
            <div class="flex justify-between items-center">
              <div>
                <div class="text-sm text-orange-600 mb-1">基础消费总额</div>
                <div class="text-xl font-bold text-orange-700">
                  {{ formatCurrency(summary.totalBasicExpense) }}
                </div>
              </div>
              <div>
                <div class="text-sm text-orange-600 mb-1">占总支出比例</div>
                <div class="text-xl font-bold text-orange-700">
                  {{ summary.basicExpensePercentage.toFixed(1) }}%
                </div>
              </div>
              <div>
                <div class="text-sm text-orange-600 mb-1">基础消费笔数</div>
                <div class="text-xl font-bold text-orange-700">
                  {{ summary.basicExpenseCount }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 收入支出趋势图 -->
        <div class="bg-white p-4 rounded-lg shadow-sm">
          <h3 class="text-lg font-medium mb-4">收支趋势</h3>
          <div class="h-64">
            <canvas ref="trendChart"></canvas>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 收入分类饼图 -->
        <div class="bg-white p-4 rounded-lg shadow-sm">
          <h3 class="text-lg font-medium mb-4">收入分类</h3>
          <div v-if="summary.incomeByCategoryCount > 0" class="h-64">
            <canvas ref="incomeChart"></canvas>
          </div>
          <div v-else class="h-64 flex items-center justify-center text-gray-500">
            无收入数据
          </div>
        </div>
        
        <!-- 支出分类饼图 -->
        <div class="bg-white p-4 rounded-lg shadow-sm">
          <h3 class="text-lg font-medium mb-4">支出分类</h3>
          <div v-if="summary.expenseByCategoryCount > 0" class="h-64">
            <canvas ref="expenseChart"></canvas>
          </div>
          <div v-else class="h-64 flex items-center justify-center text-gray-500">
            无支出数据
          </div>
        </div>
      </div>
      
      <!-- 详细数据表格 -->
      <div class="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
        <UDivider class="mb-0 mt-6" />
        <h3 class="text-lg font-medium p-4">详细数据</h3>
        
        <UTabs :items="tabItems">
          <template #income>
            <UTable 
              :columns="tableColumns" 
              :rows="incomeData"
              :empty-state="{ icon: 'i-heroicons-banknotes', label: '暂无收入数据' }"
            >
              <template #amount-data="{ row }">
                {{ formatCurrency(row.amount) }}
              </template>
              <template #percentage-data="{ row }">
                <div class="flex items-center">
                  <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      class="bg-green-500 h-2 rounded-full"
                      :style="{ width: `${row.percentage}%` }"
                    ></div>
                  </div>
                  <span>{{ row.percentage.toFixed(1) }}%</span>
                </div>
              </template>
            </UTable>
          </template>
          
          <template #expense>
            <UTable 
              :columns="tableColumns" 
              :rows="expenseData"
              :empty-state="{ icon: 'i-heroicons-banknotes', label: '暂无支出数据' }"
            >
              <template #amount-data="{ row }">
                {{ formatCurrency(row.amount) }}
              </template>
              <template #percentage-data="{ row }">
                <div class="flex items-center">
                  <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      class="bg-red-500 h-2 rounded-full"
                      :style="{ width: `${row.percentage}%` }"
                    ></div>
                  </div>
                  <span>{{ row.percentage.toFixed(1) }}%</span>
                </div>
              </template>
            </UTable>
          </template>
          
          <template #basicExpense>
            <div v-if="summary.basicExpenseCount > 0">
              <div class="p-4 bg-orange-50 rounded-lg mb-4">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-sm text-orange-600 mb-1">基础消费总额</div>
                    <div class="text-xl font-bold text-orange-700">
                      {{ formatCurrency(summary.totalBasicExpense) }}
                    </div>
                  </div>
                  <div>
                    <div class="text-sm text-orange-600 mb-1">占总支出比例</div>
                    <div class="text-xl font-bold text-orange-700">
                      {{ summary.basicExpensePercentage.toFixed(1) }}%
                    </div>
                  </div>
                </div>
              </div>
              
              <UTable 
                :columns="tableColumns" 
                :rows="basicExpenseData"
                :empty-state="{ icon: 'i-heroicons-home', label: '暂无基础消费数据' }"
              >
                <template #amount-data="{ row }">
                  {{ formatCurrency(row.amount) }}
                </template>
                <template #percentage-data="{ row }">
                  <div class="flex items-center">
                    <div class="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        class="bg-orange-500 h-2 rounded-full"
                        :style="{ width: `${row.percentage}%` }"
                      ></div>
                    </div>
                    <span>{{ row.percentage.toFixed(1) }}%</span>
                  </div>
                </template>
              </UTable>
            </div>
            <div v-else class="p-4 text-center text-gray-500">
              暂无基础消费数据
            </div>
          </template>
        </UTabs>
      </div>
    </template>
    
    <!-- 无数据提示 -->
    <div v-else-if="!isLoading" class="bg-white p-6 rounded-lg shadow-sm text-center">
      <UIcon name="i-heroicons-chart-bar" class="h-16 w-16 mx-auto text-gray-400" />
      <h3 class="mt-4 text-lg font-medium text-gray-900">暂无报表数据</h3>
      <p class="mt-2 text-gray-500">
        请选择时间周期和年份，然后点击"生成报表"按钮。
      </p>
    </div>
  </div>
</template>

<script setup>
import { api, getUserId } from '~/utils/api';
import { Chart, registerables } from 'chart.js';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 注册Chart.js组件
Chart.register(...registerables);
dayjs.locale('zh-cn');

// 图表引用
const trendChart = ref(null);
const incomeChart = ref(null);
const expenseChart = ref(null);

// 图表实例
let trendChartInstance = null;
let incomeChartInstance = null;
let expenseChartInstance = null;

// 表格列定义
const tableColumns = [
  {
    key: 'name',
    label: '类别',
  },
  {
    key: 'amount',
    label: '金额',
  },
  {
    key: 'count',
    label: '次数',
  },
  {
    key: 'percentage',
    label: '占比',
  },
];

// 选项
const periodOptions = [
  { label: '按月', value: 'month' },
  { label: '按季度', value: 'quarter' },
  { label: '按年', value: 'year' },
];

const basicExpenseOptions = [
  { label: '包含', value: 1 },
  { label: '不包含', value: 0 },
];

const quarterOptions = [
  { label: '第一季度', value: 1 },
  { label: '第二季度', value: 2 },
  { label: '第三季度', value: 3 },
  { label: '第四季度', value: 4 },
]

const monthOptions = [
  { label: '一月', value: 1 },
  { label: '二月', value: 2 },
  { label: '三月', value: 3 },
  { label: '四月', value: 4 },
  { label: '五月', value: 5 },
  { label: '六月', value: 6 },
  { label: '七月', value: 7 },
  { label: '八月', value: 8 },
  { label: '九月', value: 9 },
  { label: '十月', value: 10 },
  { label: '十一月', value: 11 },
  { label: '十二月', value: 12 },
]

// 动态生成年份选项，最近5年
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  
  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;
    years.push({
      label: `${year}年`,
      value: year,
    });
  }
  
  return years;
});

// 标签选项
const tabItems = [
  {
    label: '收入',
    slot: 'income',
    icon: 'i-heroicons-arrow-trending-up',
  },
  {
    label: '支出',
    slot: 'expense',
    icon: 'i-heroicons-arrow-trending-down',
  },
  {
    label: '基础消费',
    slot: 'basicExpense',
    icon: 'i-heroicons-home',
  },
];

// 状态变量
const isLoading = ref(false);
const hasData = ref(false);
const filters = ref({
  period: 'month',
  year: new Date().getFullYear(),
  includeBasicExpense: 1,
});

// 报表数据
const reportData = ref({});
const summary = ref({
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  totalCount: 0,
  incomeByCategoryCount: 0,
  expenseByCategoryCount: 0,
  totalBasicExpense: 0,
  basicExpenseCount: 0,
  basicExpensePercentage: 0,
});

// 处理后的数据
const periodLabels = ref([]);
const incomeData = ref([]);
const expenseData = ref([]);
const basicExpenseData = ref([]);
const incomeByPeriod = ref([]);
const expenseByPeriod = ref([]);
const basicExpenseByPeriod = ref([]);

// 格式化金额
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
};

// 加载报表数据
const loadReport = async () => {
  if (!filters.value.period || !filters.value.year) {
    return;
  }
  
  try {
    isLoading.value = true;
    
    // 基础参数
    const params = {
      userId: getUserId(),
      period: filters.value.period,
      year: filters.value.year,
      includeBasicExpense: !!filters.value.includeBasicExpense,
    };
    
    // 根据周期类型添加必要参数
    if (filters.value.period === 'month' && filters.value.month) {
      params.month = filters.value.month;
    } else if (filters.value.period === 'quarter' && filters.value.quarter) {
      params.quarter = filters.value.quarter;
    }
    
    console.log('Report params:', params);
    
    const response = await api.get('/api/report/summary', params);
    
    if (response.success) {
      reportData.value = response.data;
      processReportData();
      hasData.value = true;
      
      // 在下一个tick渲染图表，确保DOM已更新
      nextTick(() => {
        renderCharts();
      });
    }
  } catch (error) {
    console.error('加载报表错误:', error);
  } finally {
    isLoading.value = false;
  }
};

// 处理报表数据
const processReportData = () => {
  const data = reportData.value;
  
  if (!data) {
    hasData.value = false;
    return;
  }
  
  // 使用新的数据结构
  summary.value = {
    totalIncome: data.totalIncome || 0,
    totalExpense: data.totalExpense || 0,
    balance: data.balance || 0,
    totalCount: (data.incomeTransactionCount || 0) + (data.expenseTransactionCount || 0),
    incomeByCategoryCount: Object.keys(data.incomeByCategory || {}).length,
    expenseByCategoryCount: Object.keys(data.expenseByCategory || {}).length,
    totalBasicExpense: data.totalBasicExpense || 0,
    basicExpenseCount: data.basicExpenseCount || 0,
    basicExpensePercentage: data.totalExpense ? (data.totalBasicExpense / data.totalExpense) * 100 : 0,
  };
  
  // 转换类别数据为数组
  incomeData.value = Object.entries(data.incomeByCategory || {})
    .map(([id, category]) => ({
      id,
      name: category.name,
      amount: category.amount,
      count: category.count,
      percentage: (category.amount / data.totalIncome) * 100 || 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  
  expenseData.value = Object.entries(data.expenseByCategory || {})
    .map(([id, category]) => ({
      id,
      name: category.name,
      amount: category.amount,
      count: category.count,
      percentage: (category.amount / data.totalExpense) * 100 || 0,
    }))
    .sort((a, b) => b.amount - a.amount);
    
  basicExpenseData.value = Object.entries(data.basicExpenseByCategory || {})
    .map(([id, category]) => ({
      id,
      name: category.name,
      amount: category.amount,
      count: category.count,
      percentage: (category.amount / data.totalBasicExpense) * 100 || 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  
  // 对于单一周期，可能没有周期数据，直接生成单一标签
  if (filters.value.period === 'month' || filters.value.period === 'quarter' || filters.value.year) {
    periodLabels.value = [data.period];
    incomeByPeriod.value = [data.totalIncome];
    expenseByPeriod.value = [data.totalExpense - data.totalBasicExpense]; // 不含基础消费的支出
    basicExpenseByPeriod.value = [data.totalBasicExpense];
  }
};

// 渲染图表
const renderCharts = () => {
  // 销毁现有图表
  if (trendChartInstance) trendChartInstance.destroy();
  if (incomeChartInstance) incomeChartInstance.destroy();
  if (expenseChartInstance) expenseChartInstance.destroy();
  
  // 收支趋势图
  if (trendChart.value) {
    const ctx = trendChart.value.getContext('2d');
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: periodLabels.value,
        datasets: [
          {
            label: '收入',
            data: incomeByPeriod.value,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.2,
          },
          {
            label: '支出',
            data: expenseByPeriod.value,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.2,
          },
          {
            label: '基础消费',
            data: basicExpenseByPeriod.value,
            borderColor: 'rgb(249, 115, 22)',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            fill: true,
            tension: 0.2,
            borderDash: [5, 5], // 添加虚线样式，区分基础消费
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }
  
  // 收入饼图
  if (incomeChart.value && incomeData.value.length > 0) {
    const ctx = incomeChart.value.getContext('2d');
    const labels = incomeData.value.map(item => item.name);
    const data = incomeData.value.map(item => item.amount);
    
    incomeChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(34, 197, 94, 0.6)',
              'rgba(34, 197, 94, 0.4)',
              'rgba(34, 197, 94, 0.2)',
              ...Array(labels.length - 4).fill('rgba(34, 197, 94, 0.7)'),
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }
  
  // 支出饼图
  if (expenseChart.value && expenseData.value.length > 0) {
    const ctx = expenseChart.value.getContext('2d');
    const labels = expenseData.value.map(item => item.name);
    const data = expenseData.value.map(item => item.amount);
    
    expenseChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              'rgba(239, 68, 68, 0.8)',
              'rgba(239, 68, 68, 0.6)',
              'rgba(239, 68, 68, 0.4)',
              'rgba(239, 68, 68, 0.2)',
              ...Array(labels.length - 4).fill('rgba(239, 68, 68, 0.7)'),
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }
};

// 初始加载
onMounted(() => {
  // 初始设置年份为当前年
  filters.value.year = new Date().getFullYear();
});
</script> 