<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">基础消费设置</h2>
      <UButton color="primary" icon="i-heroicons-plus" @click="showAddModal = true">
        添加基础消费
      </UButton>
    </div>
    
    <!-- 基础消费说明 -->
    <UAlert class="mb-6" color="blue" variant="soft" icon="i-heroicons-information-circle" title="什么是基础消费？">
      <template #description>
        基础消费是每月固定支出的项目，如房租、水电费等。这些消费可以被标记并在报表中单独统计。
      </template>
    </UAlert>
    
    <!-- 添加筛选区域 -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- 年份月份筛选 -->
        <UFormGroup label="生效年月">
          <div class="grid grid-cols-2 gap-2">
            <USelectMenu
              v-model="filters.year"
              :options="yearOptions"
              placeholder="年份"
              value-attribute="value"
              option-attribute="label"
            />
            <USelectMenu
              v-model="filters.month"
              :options="monthOptions"
              placeholder="月份"
              value-attribute="value"
              option-attribute="label"
            />
          </div>
        </UFormGroup>
        
        <!-- 支出类型筛选 -->
        <UFormGroup label="支出类型">
          <USelectMenu
            v-model="filters.categoryId"
            :options="categoryOptions"
            placeholder="选择类型"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormGroup>
        
        <!-- 状态筛选 -->
        <UFormGroup label="状态">
          <USelectMenu
            v-model="filters.isActive"
            :options="[
              { label: '全部', value: '' },
              { label: '启用', value: 'true' },
              { label: '禁用', value: 'false' }
            ]"
            placeholder="选择状态"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormGroup>
      </div>
      
      <div class="flex justify-end mt-4">
        <UButton color="gray" variant="soft" class="mr-2" @click="resetFilters">
          重置
        </UButton>
        <UButton color="primary" @click="loadBasicExpenses">
          查询
        </UButton>
      </div>
    </div>
    
    <!-- 基础消费列表 -->
    <div class="bg-white rounded-lg shadow-sm overflow-hidden">
      <UTable 
        :columns="columns" 
        :rows="basicExpenses" 
        :loading="isLoading"
        :empty-state="{ icon: 'i-heroicons-home', label: '暂无基础消费项目' }"
      >
        <template #amount-data="{ row }">
          <span class="text-red-600">-{{ formatCurrency(row.amount) }}</span>
        </template>
        
        <template #categoryId-data="{ row }">
          {{ getCategoryName(row.categoryId) }}
        </template>
        
        <template #isActive-data="{ row }">
          <UBadge :color="row.isActive ? 'green' : 'gray'">
            {{ row.isActive ? '启用' : '禁用' }}
          </UBadge>
        </template>
        
        <template #effectivePeriod-data="{ row }">
          <div class="text-sm">
            {{ formatDate(row.startDate) }} 至 {{ formatDate(row.endDate) }}
          </div>
        </template>
        
        <template #description-data="{ row }">
          {{ row.description }}
        </template>
        
        <template #actions-data="{ row }">
          <div class="flex">
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-pencil-square"
              size="xs"
              @click="editBasicExpense(row)"
              class="mr-1"
            />
            <UButton
              :color="row.isActive ? 'red' : 'green'"
              variant="ghost"
              :icon="row.isActive ? 'i-heroicons-pause' : 'i-heroicons-play'"
              size="xs"
              @click="toggleStatus(row)"
              class="mr-1"
            />
            <UButton
              color="red"
              variant="ghost"
              icon="i-heroicons-trash"
              size="xs"
              @click="confirmDelete(row)"
            />
          </div>
        </template>
      </UTable>
      
      <!-- 月度总计 -->
      <div class="p-4 border-t bg-gray-50">
        <div class="flex justify-between items-center">
          <div class="text-gray-600">月度总计：</div>
          <div class="text-lg font-bold text-red-600">{{ formatCurrency(totalMonthlyExpense) }}</div>
        </div>
      </div>
    </div>
    
    <!-- 添加/编辑基础消费弹窗 -->
    <UModal v-model="showAddModal">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100' }">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-base font-semibold">
              {{ isEditing ? '编辑基础消费' : '添加基础消费' }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="closeModal"
            />
          </div>
        </template>
        
        <UForm :state="formState" class="space-y-4 py-2" @submit="saveBasicExpense">
          <UFormGroup label="类别" name="categoryId">
            <USelectMenu
              v-model="formState.categoryId"
              :options="categoryOptions"
              placeholder="选择类别"
              value-attribute="value"
              option-attribute="label"
            />
          </UFormGroup>
          
          <UFormGroup label="金额" name="amount">
            <UInput
              v-model.number="formState.amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="请输入金额"
            />
          </UFormGroup>
          
          <UFormGroup label="描述" name="description">
            <UTextarea v-model="formState.description" placeholder="请输入描述" />
          </UFormGroup>
          
          <UFormGroup>
            <UCheckbox v-model="formState.isActive" label="启用" />
          </UFormGroup>
          
          <UFormGroup label="生效开始时间" name="startDate">
            <UInput
              v-model="formState.startDate"
              type="date"
              placeholder="请选择开始日期"
            />
          </UFormGroup>
          
          <UFormGroup label="生效结束时间" name="endDate">
            <UInput
              v-model="formState.endDate"
              type="date"
              placeholder="请选择结束日期"
            />
          </UFormGroup>
        </UForm>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="closeModal">
              取消
            </UButton>
            <UButton
              color="primary"
              :loading="isSaving"
              @click="saveBasicExpense"
            >
              保存
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
    
    <!-- 删除确认弹窗 -->
    <UModal v-model="showDeleteModal">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100' }">
        <template #header>
          <h3 class="text-base font-semibold">确认删除</h3>
        </template>
        
        <div class="py-4">
          确定要删除此基础消费项目吗？该操作无法撤销。
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="showDeleteModal = false">
              取消
            </UButton>
            <UButton
              color="red"
              :loading="isDeleting"
              @click="deleteBasicExpense"
            >
              删除
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
import { api, getUserId } from '~/utils/api';
import dayjs from 'dayjs';

// 表格列定义
const columns = [
  {
    key: 'categoryId',
    label: '类别',
  },
  {
    key: 'amount',
    label: '金额',
  },
  {
    key: 'effectivePeriod',
    label: '生效期间',
  },
  {
    key: 'description',
    label: '描述',
  },
  {
    key: 'isActive',
    label: '状态',
  },
  {
    key: 'actions',
    label: '操作',
  },
];

// 状态变量
const basicExpenses = ref([]);
const categories = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const formState = ref({
  categoryId: '',
  amount: 0,
  description: '',
  isActive: true,
  startDate: dayjs().format('YYYY-MM-DD'),
  endDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
});
const isEditing = ref(false);
const currentBasicExpense = ref(null);
const filters = ref({
  year: '',
  month: '',
  categoryId: '',
  isActive: '',
});

// 计算属性
const categoryOptions = computed(() => {
  return categories.value.map(category => ({
    label: category.name,
    value: category._id,
  }));
});

const totalMonthlyExpense = computed(() => {
  return basicExpenses.value
    .filter(item => item.isActive)
    .reduce((sum, item) => sum + item.amount, 0);
});

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  return [
    { label: '全部', value: '' },
    { label: `${currentYear}年`, value: currentYear },
    { label: `${currentYear + 1}年`, value: currentYear + 1 },
    { label: `${currentYear + 2}年`, value: currentYear + 2 },
  ];
});

const monthOptions = [
  { label: '全部', value: '' },
  { label: '1月', value: 1 },
  { label: '2月', value: 2 },
  { label: '3月', value: 3 },
  { label: '4月', value: 4 },
  { label: '5月', value: 5 },
  { label: '6月', value: 6 },
  { label: '7月', value: 7 },
  { label: '8月', value: 8 },
  { label: '9月', value: 9 },
  { label: '10月', value: 10 },
  { label: '11月', value: 11 },
  { label: '12月', value: 12 },
];

// 格式化金额
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// 获取类别名称
const getCategoryName = (categoryId) => {
  if (!categoryId) return '未指定类别';
  
  const category = categories.value.find(c => c._id === (categoryId?._id || categoryId));
  console.log('category', category);
  if (category) {
    return category.name;
  } else {
    console.warn(`未找到ID为 ${categoryId} 的类别`);
    return '未知类别';
  }
};

// 加载基础消费列表
const loadBasicExpenses = async () => {
  try {
    isLoading.value = true;
    
    // 构建查询参数
    const params = {};
    
    // 添加年月筛选
    if (filters.value.year) {
      params.year = filters.value.year;
    }
    
    if (filters.value.month) {
      params.month = filters.value.month;
    }
    
    // 添加类别筛选
    if (filters.value.categoryId) {
      params.categoryId = filters.value.categoryId;
    }
    
    // 添加状态筛选
    if (filters.value.isActive !== '') {
      params.isActive = filters.value.isActive;
    }
    
    const response = await api.get('/api/basic-expenses', params);
    
    if (response.success) {
      basicExpenses.value = response.data;
    }
  } catch (error) {
    console.error('加载基础消费错误:', error);
  } finally {
    isLoading.value = false;
  }
};

// 加载类别
const loadCategories = async () => {
  try {
    console.log('Loading expense categories...');
    
    const response = await api.get('/api/categories', {
      type: 'expense'  // 确保只获取支出类型的类别
    });
    
    if (response.success) {
      categories.value = response.data;
      console.log('Loaded categories:', categories.value);
    } else {
      console.error('加载类别失败:', response);
    }
  } catch (error) {
    console.error('加载类别错误:', error);
  }
};

// 关闭弹窗
const closeModal = () => {
  showAddModal.value = false;
  isEditing.value = false;
  resetForm();
};

// 重置表单
const resetForm = () => {
  formState.value = {
    categoryId: '',
    amount: 0,
    description: '',
    isActive: true,
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().add(1, 'year').format('YYYY-MM-DD'),
  };
  currentBasicExpense.value = null;
  resetFilters();
};

// 编辑基础消费
const editBasicExpense = (basicExpense) => {
  isEditing.value = true;
  currentBasicExpense.value = basicExpense;
  const categoryId = basicExpense.categoryId?._id || basicExpense.categoryId;
  
  console.log('Editing basic expense:', basicExpense);
  console.log('Category ID:', categoryId);
  console.log('Available categories:', categories.value);
  
  // 检查类别是否存在
  const categoryExists = categories.value.some(c => c._id === categoryId);
  if (!categoryExists) {
    console.warn(`类别ID ${categoryId} 不在可用类别列表中`);
  }
  
  formState.value = {
    categoryId,
    amount: basicExpense.amount,
    description: basicExpense.description,
    isActive: basicExpense.isActive,
    startDate: basicExpense.startDate,
    endDate: basicExpense.endDate,
  };
  
  showAddModal.value = true;
};

// 切换状态
const toggleStatus = async (basicExpense) => {
  try {
    console.log('Toggling status for:', basicExpense._id);
    
    // 确保包含所有必要参数
    const data = {
      userId: getUserId(),
      isActive: !basicExpense.isActive,
      
      // 添加其他必要字段，避免后端验证失败
      categoryId: typeof basicExpense.categoryId === 'object' 
        ? basicExpense.categoryId._id 
        : basicExpense.categoryId,
      amount: basicExpense.amount,
      description: basicExpense.description,
      startDate: basicExpense.startDate,
      endDate: basicExpense.endDate
    };
    
    console.log('Sending data:', data);
    
    const response = await api.put(`/api/basic-expenses/${basicExpense._id}`, data);
    
    if (response.success) {
      // 操作成功，刷新列表
      loadBasicExpenses();
      
      // 使用 NuxtUI toast 显示成功消息
      useToast().add({
        title: '操作成功',
        description: '已' + (data.isActive ? '启用' : '停用') + '该基础消费',
        color: 'green'
      });
    } else {
      console.error('切换状态失败:', response);
      
      // 使用 NuxtUI toast 显示错误消息
      useToast().add({
        title: '操作失败',
        description: response.message || '请稍后重试',
        color: 'red'
      });
    }
  } catch (error) {
    console.error('切换状态错误:', error);
    
    // 使用 NuxtUI toast 显示错误消息
    useToast().add({
      title: '网络错误',
      description: '请检查网络连接并重试',
      color: 'red'
    });
  }
};

// 保存基础消费
const saveBasicExpense = async () => {
  try {
    isSaving.value = true;
    
    if (!formState.value.categoryId || formState.value.amount <= 0) {
      // 简单的前端验证
      return;
    }
    
    const data = {
      ...formState.value,
      userId: getUserId(),
    };
    
    let response;
    
    if (isEditing.value && currentBasicExpense.value) {
      response = await api.put(`/api/basic-expenses/${currentBasicExpense.value._id}`, data);
    } else {
      response = await api.post('/api/basic-expenses', data);
    }
    
    if (response.success) {
      closeModal();
      loadBasicExpenses();
    }
  } catch (error) {
    console.error('保存基础消费错误:', error);
  } finally {
    isSaving.value = false;
  }
};

// 确认删除
const confirmDelete = (basicExpense) => {
  currentBasicExpense.value = basicExpense;
  showDeleteModal.value = true;
};

// 删除基础消费
const deleteBasicExpense = async () => {
  if (!currentBasicExpense.value) return;
  
  try {
    isDeleting.value = true;
    
    const response = await api.delete(`/api/basic-expenses/${currentBasicExpense.value._id}`);
    
    if (response.success) {
      showDeleteModal.value = false;
      loadBasicExpenses();
    }
  } catch (error) {
    console.error('删除基础消费错误:', error);
  } finally {
    isDeleting.value = false;
  }
};

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD');
};

// 重置筛选条件
const resetFilters = () => {
  filters.value = {
    year: '',
    month: '',
    categoryId: '',
    isActive: '',
  };
  loadBasicExpenses();
};

// 初始加载
onMounted(() => {
  loadCategories();
  loadBasicExpenses();
});
</script> 