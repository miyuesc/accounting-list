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
      <!-- 收入支出总览 -->
      <div class="mb-6 bg-white p-4 rounded-lg shadow-sm">
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
        <div v-if="displayBasicExpense" class="mt-4 bg-orange-50 p-4 rounded-lg">
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

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
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
      <div class="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
        <h3 class="text-lg font-medium p-4">详细数据</h3>
        
        <UTabs :items="displayTabItems">
          <template #income>
            <UTable 
              :columns="tableColumns" 
              :rows="incomeDataTree"
              :empty-state="{ icon: 'i-heroicons-banknotes', label: '暂无收入数据' }"
            >
              <template #name-data="{ row }">
                <div :style="{ paddingLeft: `${row.level * 20}px` }" class="flex items-center">
                  <UIcon v-if="row.hasChildren" 
                         :name="row.isExpanded ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" 
                         class="mr-1 cursor-pointer"
                         @click="toggleTreeNode(row, 'income')" />
                  <span>{{ row.name }}</span>
                </div>
              </template>
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
              :rows="expenseDataTree"
              :empty-state="{ icon: 'i-heroicons-banknotes', label: '暂无支出数据' }"
            >
              <template #name-data="{ row }">
                <div :style="{ paddingLeft: `${row.level * 20}px` }" class="flex items-center">
                  <UIcon v-if="row.hasChildren" 
                         :name="row.isExpanded ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" 
                         class="mr-1 cursor-pointer"
                         @click="toggleTreeNode(row, 'expense')" />
                  <span>{{ row.name }}</span>
                </div>
              </template>
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
      
      <!-- 收支趋势图 - 移到最底部，并根据条件显示 -->
      <div v-if="showTrendChart" class="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <h3 class="text-lg font-medium mb-4">收支趋势</h3>
        <div class="h-64">
          <canvas ref="trendChart"></canvas>
        </div>
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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
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
  { label: '按年', value: 'year' },
  { label: '按季度', value: 'quarter' },
  { label: '按月', value: 'month' },
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

// 添加新的状态变量控制基础消费显示
const displayBasicExpense = ref(true);

// 根据是否包含基础消费动态显示标签页
const displayTabItems = computed(() => {
  if (displayBasicExpense.value) {
    return tabItems;
  } else {
    // 过滤掉基础消费标签
    return tabItems.filter(tab => tab.slot !== 'basicExpense');
  }
});

// 状态变量
const isLoading = ref(false);
const hasData = ref(false);
const filters = ref({
  period: 'year',
  year: new Date().getFullYear(),
  includeBasicExpense: 1,
  type: '',
});

// 添加类别选项变量
const categoryOptions = ref([]);

// 添加加载类别的函数
const loadCategories = async () => {
  try {
    const response = await api.get('/api/categories');
    
    if (response.success) {
      categoryOptions.value = response.data.map(category => ({
        label: category.name,
        value: category._id || category.id,
        type: category.type
      }));
    }
  } catch (error) {
    console.error('加载类别错误:', error);
  }
};

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

// 添加显示趋势图的计算属性
const showTrendChart = computed(() => {
  // 按月统计时不显示趋势图
  return filters.value.period !== 'month' && hasData.value;
});

// 添加树形结构数据
const incomeDataTree = ref([]);
const expenseDataTree = ref([]);

// 添加类型选择器
const reportTypeOptions = [
  { label: '全部', value: '' },
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' }
];

// 添加计算属性，根据选择的类型筛选类别
const filteredCategoryOptions = computed(() => {
  if (!filters.value.type || !categoryOptions.value || categoryOptions.value.length === 0) {
    return categoryOptions.value || [];
  }
  
  return categoryOptions.value.filter(category => {
    // 根据选择的类型筛选类别
    if (filters.value.type === 'income') {
      return category.type === 'income';
    } else if (filters.value.type === 'expense') {
      return category.type === 'expense';
    }
    return true; // 如果没有选择类型，返回所有类别
  });
});

// 加载报表数据
const loadReport = async () => {
  if (!filters.value.period || !filters.value.year) {
    return;
  }
  
  try {
    isLoading.value = true;
    
    // 基础参数
    const params = {
      period: filters.value.period,
      year: filters.value.year,
      includeBasicExpense: !!filters.value.includeBasicExpense,
      includeMonthlyData: true, // 添加此参数，确保获取月度数据
    };
    
    // 根据周期类型添加必要参数
    if (filters.value.period === 'month' && filters.value.month) {
      params.month = filters.value.month;
    } else if (filters.value.period === 'quarter' && filters.value.quarter) {
      params.quarter = filters.value.quarter;
    }
    
    // 类别分析级别
    if (filters.value.categoryLevel) {
      params.categoryLevel = filters.value.categoryLevel;
    }
    
    // 发送报表请求
    const response = await api.get('/api/reports/summary', params);
    
    if (response.success) {
      reportData.value = response.data;
      
      // 不调用不存在的方法，数据处理将在finally块中进行
    }
  } catch (error) {
    console.error('加载报表错误:', error);
  } finally {
    // 在成功加载报表后更新基础消费显示状态
    displayBasicExpense.value = !!filters.value.includeBasicExpense;
    
    processReportData();
    hasData.value = true;
    isLoading.value = false;
    
    // 使用延迟确保DOM完全更新
    setTimeout(() => {
      nextTick(() => {
        console.log('准备渲染图表');
        renderCharts();
      });
    }, 100);
  }
};

// 处理报表数据
const processReportData = () => {
  const data = reportData.value;
  
  if (!data) {
    hasData.value = false;
    return;
  }
  
  console.log('处理报表数据:', data);
  
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
  
  console.log('Summary:', summary.value);
  
  // 转换类别数据为数组，使用类别的type属性过滤
  if (data.incomeByCategory) {
    incomeData.value = Object.entries(data.incomeByCategory)
      .filter(([_, category]) => category.type === 'income') // 使用服务器返回的类型信息过滤
      .map(([id, category]) => ({
        id,
        name: category.name,
        amount: category.amount,
        count: category.count,
        percentage: (category.amount / (data.totalIncome || 1)) * 100 || 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  } else {
    incomeData.value = [];
  }
  
  if (data.expenseByCategory) {
    expenseData.value = Object.entries(data.expenseByCategory)
      .filter(([_, category]) => category.type === 'expense') // 使用服务器返回的类型信息过滤
      .map(([id, category]) => ({
        id,
        name: category.name,
        amount: category.amount,
        count: category.count,
        percentage: (category.amount / (data.totalExpense || 1)) * 100 || 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  } else {
    expenseData.value = [];
  }
    
  if (data.basicExpenseByCategory) {
    basicExpenseData.value = Object.entries(data.basicExpenseByCategory)
      .filter(([_, category]) => category.type === 'expense') // 基础消费肯定是支出类型
      .map(([id, category]) => ({
        id,
        name: category.name,
        amount: category.amount,
        count: category.count,
        percentage: (category.amount / (data.totalBasicExpense || 1)) * 100 || 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  } else {
    basicExpenseData.value = [];
  }
  
  console.log('Income data:', incomeData.value);
  console.log('Expense data:', expenseData.value);
  
  // 构建树形结构数据
  buildCategoryTree();
  
  // 趋势图数据处理 - 直接使用服务器返回的月度数据
  processMonthlyTrendData(data);
};

// 月度趋势数据处理
const processMonthlyTrendData = (data) => {
  if (data.monthlyData && Array.isArray(data.monthlyData) && data.monthlyData.length > 0) {
    // 确保月度数据按月份排序
    const sortedMonthlyData = [...data.monthlyData].sort((a, b) => {
      return a.period.localeCompare(b.period);
    });
    
    // 提取月度标签 - 转换为更友好的显示格式
    periodLabels.value = sortedMonthlyData.map(item => {
      // 如果period格式为"2023-01"，转换为"1月"这样的格式
      const parts = item.period.split('-');
      if (parts.length === 2) {
        return `${parseInt(parts[1])}月`;
      }
      return item.period;
    });
    
    // 提取月度数据
    incomeByPeriod.value = sortedMonthlyData.map(item => item.income || 0);
    expenseByPeriod.value = sortedMonthlyData.map(item => (item.expense || 0) - (item.basicExpense || 0));
    basicExpenseByPeriod.value = sortedMonthlyData.map(item => item.basicExpense || 0);
  } else {
    // 如果没有月度数据，则显示单一数据点
    periodLabels.value = [data.period || '当前期间'];
    incomeByPeriod.value = [data.totalIncome || 0];
    expenseByPeriod.value = [(data.totalExpense || 0) - (data.totalBasicExpense || 0)];
    basicExpenseByPeriod.value = [data.totalBasicExpense || 0];
  }
};

// 构建类别树形结构 - 移除类型过滤，依赖后端正确返回数据
const buildCategoryTree = () => {
  // 处理收入类别树
  const incomeCategoryTree = buildTreeFromCategories(
    Object.entries(reportData.value.incomeByCategory || {})
      .map(([id, category]) => ({
        id,
        name: category.name,
        amount: category.amount,
        count: category.count,
        parentId: category.parentId,
        percentage: (category.amount / (reportData.value.totalIncome || 1)) * 100 || 0,
      }))
  );
  
  // 处理支出类别树 - 根据需要隐藏基础消费
  const expenseCategoryTree = buildTreeFromCategories(
    Object.entries(reportData.value.expenseByCategory || {})
      .filter(([_, category]) => displayBasicExpense.value || !category.isBasicExpense)
      .map(([id, category]) => ({
        id,
        name: category.name,
        amount: category.amount,
        count: category.count,
        parentId: category.parentId,
        percentage: (category.amount / (reportData.value.totalExpense || 1)) * 100 || 0,
      }))
  );
  
  // 将树转换为扁平结构，带有层级信息
  incomeDataTree.value = flattenTree(incomeCategoryTree);
  expenseDataTree.value = flattenTree(expenseCategoryTree);
};

// 从类别数组构建树
const buildTreeFromCategories = (categories) => {
  const nodes = {};
  const rootNodes = [];
  
  // 创建所有节点
  categories.forEach(category => {
    nodes[category.id] = {
      ...category,
      children: [],
      isExpanded: true, // 默认展开
      hasChildren: false
    };
  });
  
  // 构建父子关系
  categories.forEach(category => {
    if (category.parentId && nodes[category.parentId]) {
      // 有父节点，添加到父节点的children
      nodes[category.parentId].children.push(nodes[category.id]);
      nodes[category.parentId].hasChildren = true;
    } else {
      // 没有父节点，是根节点
      rootNodes.push(nodes[category.id]);
    }
  });
  
  return rootNodes;
};

// 将树形结构扁平化，用于表格显示
const flattenTree = (nodes, level = 0, result = []) => {
  nodes.forEach(node => {
    // 添加当前节点，带有层级信息
    const nodeWithLevel = {
      ...node,
      level
    };
    
    delete nodeWithLevel.children; // 删除children属性，避免表格渲染问题
    
    result.push(nodeWithLevel);
    
    // 如果节点展开且有子节点，递归添加子节点
    if (node.isExpanded && node.children && node.children.length > 0) {
      flattenTree(node.children, level + 1, result);
    }
  });
  
  return result;
};

// 切换树节点展开/折叠
const toggleTreeNode = (node, type) => {
  // 查找该节点并切换其展开状态
  const allNodes = type === 'income' ? reportData.value.incomeByCategory : reportData.value.expenseByCategory;
  
  if (allNodes[node.id]) {
    allNodes[node.id].isExpanded = !allNodes[node.id].isExpanded;
    
    // 重新构建树
    buildCategoryTree();
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
    
    // 准备数据集
    const datasets = [
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
    ];
    
    // 仅在包含基础消费时添加基础消费数据集
    if (displayBasicExpense.value) {
      datasets.push({
        label: '基础消费',
        data: basicExpenseByPeriod.value,
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.2,
        borderDash: [5, 5], // 添加虚线样式，区分基础消费
      });
    }
    
    trendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: periodLabels.value,
        datasets: datasets,
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
          legend: {
            position: 'top',
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return formatCurrency(value).split('.')[0]; // 简化Y轴显示
              }
            }
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
              'rgba(34, 197, 94, 0.7)',
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
              'rgba(239, 68, 68, 0.7)',
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

// 监听类型变化，重置类别选择
watch(() => filters.value.type, (newType) => {
  // 类型变化时清空已选类别
  filters.value.categoryId = '';
});

// 初始加载
onMounted(() => {
  // 初始设置年份为当前年
  filters.value.year = new Date().getFullYear();
  // 加载类别数据
  loadCategories();
});
</script> 