<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">基础消费设置</h2>
      <UButton color="primary" icon="i-heroicons-plus" @click="showAddModal = true">
        添加基础消费
      </UButton>
    </div>
    
    <!-- 基础消费说明 -->
    <UAlert class="mb-6" color="blue" variant="soft" icon="i-heroicons-information-circle">
      <h3 class="font-medium mb-1">什么是基础消费？</h3>
      <p>基础消费是每月固定支出的项目，如房租、水电费等。这些消费可以被标记并在报表中单独统计。</p>
    </UAlert>
    
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
            <USelect v-model="formState.categoryId" :options="categoryOptions" placeholder="选择类别" />
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
});
const isEditing = ref(false);
const currentBasicExpense = ref(null);

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
  const category = categories.value.find(c => c._id === categoryId);
  return category ? category.name : '未知类别';
};

// 加载基础消费列表
const loadBasicExpenses = async () => {
  try {
    isLoading.value = true;
    
    const response = await api.get('/api/basic-expenses', {
      userId: getUserId(),
    });
    
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
    const response = await api.get('/api/categories');
    
    if (response.success) {
      categories.value = response.data;
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
  };
  currentBasicExpense.value = null;
};

// 编辑基础消费
const editBasicExpense = (basicExpense) => {
  isEditing.value = true;
  currentBasicExpense.value = basicExpense;
  
  formState.value = {
    categoryId: basicExpense.categoryId,
    amount: basicExpense.amount,
    description: basicExpense.description,
    isActive: basicExpense.isActive,
  };
  
  showAddModal.value = true;
};

// 切换状态
const toggleStatus = async (basicExpense) => {
  try {
    const response = await api.put(`/api/basic-expenses/${basicExpense._id}`, {
      isActive: !basicExpense.isActive,
    });
    
    if (response.success) {
      loadBasicExpenses();
    }
  } catch (error) {
    console.error('切换状态错误:', error);
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

// 初始加载
onMounted(() => {
  loadCategories();
  loadBasicExpenses();
});
</script> 