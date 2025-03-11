<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">交易记录列表</h2>
      <UButton color="primary" icon="i-heroicons-plus" @click="showAddModal = true">
        添加交易
      </UButton>
    </div>
    
    <!-- 过滤器 -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UFormGroup label="类型">
          <USelect
            v-model="filters.type"
            :options="typeOptions"
            placeholder="全部"
          />
        </UFormGroup>
        
        <UFormGroup label="类别">
          <USelect
            v-model="filters.categoryId"
            :options="categoryOptions"
            placeholder="全部"
          />
        </UFormGroup>
        
        <UFormGroup label="时间范围">
          <USelect
            v-model="filters.period"
            :options="periodOptions"
            placeholder="自定义"
          />
        </UFormGroup>
        
        <UFormGroup label="基础消费">
          <USelect
            v-model="filters.isBasicExpense"
            :options="basicExpenseOptions"
            placeholder="全部"
          />
        </UFormGroup>
      </div>
      
      <div class="flex justify-end mt-4">
        <UButton color="gray" variant="soft" class="mr-2" @click="resetFilters">
          重置
        </UButton>
        <UButton color="primary" @click="loadTransactions">
          查询
        </UButton>
      </div>
    </div>
    
    <!-- 交易记录表格 -->
    <div class="bg-white rounded-lg shadow-sm overflow-hidden">
      <UTable :columns="columns" :rows="transactions" :loading="isLoading">
        <template #amount-data="{ row }">
          <span :class="row.type === 'income' ? 'text-green-600' : 'text-red-600'">
            {{ row.type === 'income' ? '+' : '-' }}{{ formatCurrency(row.amount) }}
          </span>
        </template>
        
        <template #type-data="{ row }">
          <UBadge :color="row.type === 'income' ? 'green' : 'red'">
            {{ row.type === 'income' ? '收入' : '支出' }}
          </UBadge>
        </template>
        
        <template #transactionDate-data="{ row }">
          {{ formatDate(row.transactionDate) }}
        </template>
        
        <template #isBasicExpense-data="{ row }">
          <UIcon v-if="row.isBasicExpense" name="i-heroicons-check" class="text-green-500" />
          <UIcon v-else name="i-heroicons-x-mark" class="text-gray-400" />
        </template>
        
        <template #actions-data="{ row }">
          <div class="flex">
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-pencil-square"
              size="xs"
              @click="editTransaction(row)"
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
      
      <!-- 分页 -->
      <div class="p-4 border-t flex justify-between items-center">
        <div class="text-sm text-gray-500">
          共 {{ pagination.total }} 条记录
        </div>
        <UPagination
          v-model="pagination.page"
          :page-count="pagination.pages"
          :total="pagination.total"
          :ui="{ rounded: 'rounded-full' }"
          @update:model-value="loadTransactions"
        />
      </div>
    </div>
    
    <!-- 添加/编辑交易弹窗 -->
    <UModal v-model="showAddModal">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100' }">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-base font-semibold">
              {{ isEditing ? '编辑交易' : '添加交易' }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="closeModal"
            />
          </div>
        </template>
        
        <UForm :state="formState" class="space-y-4 py-2" @submit="saveTransaction">
          <UFormGroup label="类型" name="type">
            <URadioGroup v-model="formState.type" :options="typeOptions" />
          </UFormGroup>
          
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
          
          <UFormGroup label="日期" name="transactionDate">
            <UInput v-model="formState.transactionDate" type="date" />
          </UFormGroup>
          
          <UFormGroup label="描述" name="description">
            <UTextarea v-model="formState.description" placeholder="请输入描述" />
          </UFormGroup>
          
          <UFormGroup>
            <UCheckbox v-model="formState.isBasicExpense" label="基础消费" />
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
              @click="saveTransaction"
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
          确定要删除这笔交易记录吗？该操作无法撤销。
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="showDeleteModal = false">
              取消
            </UButton>
            <UButton
              color="red"
              :loading="isDeleting"
              @click="deleteTransaction"
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
    key: 'type',
    label: '类型',
  },
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
    key: 'transactionDate',
    label: '日期',
    sortable: true,
  },
  {
    key: 'isBasicExpense',
    label: '基础消费',
  },
  {
    key: 'actions',
    label: '操作',
  },
];

// 过滤选项
const typeOptions = [
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' },
];

const periodOptions = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本季度', value: 'quarter' },
  { label: '本年', value: 'year' },
];

const basicExpenseOptions = [
  { label: '是', value: 'true' },
  { label: '否', value: 'false' },
];

// 状态变量
const transactions = ref([]);
const categoryOptions = ref([]);
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
});
const filters = ref({
  type: '',
  categoryId: '',
  period: 'month', // 默认本月
  isBasicExpense: '',
});
const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const formState = ref({
  type: 'expense',
  categoryId: '',
  amount: 0,
  description: '',
  transactionDate: dayjs().format('YYYY-MM-DD'),
  isBasicExpense: false,
});
const isEditing = ref(false);
const currentTransaction = ref(null);

// 格式化金额
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// 格式化日期
const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD');
};

// 重置过滤条件
const resetFilters = () => {
  filters.value = {
    type: '',
    categoryId: '',
    period: 'month',
    isBasicExpense: '',
  };
  pagination.value.page = 1;
  loadTransactions();
};

// 加载交易记录
const loadTransactions = async () => {
  try {
    isLoading.value = true;
    
    // 构建查询参数
    const params = {
      userId: getUserId(),
      page: pagination.value.page,
      limit: pagination.value.limit,
    };
    
    if (filters.value.type) {
      params.type = filters.value.type;
    }
    
    if (filters.value.categoryId) {
      params.categoryId = filters.value.categoryId;
    }
    
    if (filters.value.period) {
      params.period = filters.value.period;
    }
    
    if (filters.value.isBasicExpense !== '') {
      params.isBasicExpense = filters.value.isBasicExpense;
    }
    
    const response = await api.get('/api/transactions', params);
    
    if (response.success) {
      transactions.value = response.data.transactions;
      pagination.value = response.data.pagination;
    }
  } catch (error) {
    console.error('加载交易记录错误:', error);
  } finally {
    isLoading.value = false;
  }
};

// 加载类别
const loadCategories = async () => {
  try {
    const response = await api.get('/api/categories');
    
    if (response.success) {
      categoryOptions.value = response.data.map(category => ({
        label: category.name,
        value: category._id,
      }));
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
    type: 'expense',
    categoryId: '',
    amount: 0,
    description: '',
    transactionDate: dayjs().format('YYYY-MM-DD'),
    isBasicExpense: false,
  };
  currentTransaction.value = null;
};

// 编辑交易
const editTransaction = (transaction) => {
  isEditing.value = true;
  currentTransaction.value = transaction;
  
  formState.value = {
    type: transaction.type,
    categoryId: transaction.categoryId._id || transaction.categoryId,
    amount: transaction.amount,
    description: transaction.description,
    transactionDate: formatDate(transaction.transactionDate),
    isBasicExpense: transaction.isBasicExpense,
  };
  
  showAddModal.value = true;
};

// 保存交易
const saveTransaction = async () => {
  try {
    isSaving.value = true;
    
    const data = {
      ...formState.value,
      userId: getUserId(),
    };
    
    let response;
    
    if (isEditing.value && currentTransaction.value) {
      response = await api.put(`/api/transactions/${currentTransaction.value._id}`, data);
    } else {
      response = await api.post('/api/transactions', data);
    }
    
    if (response.success) {
      closeModal();
      loadTransactions();
    }
  } catch (error) {
    console.error('保存交易错误:', error);
  } finally {
    isSaving.value = false;
  }
};

// 确认删除
const confirmDelete = (transaction) => {
  currentTransaction.value = transaction;
  showDeleteModal.value = true;
};

// 删除交易
const deleteTransaction = async () => {
  if (!currentTransaction.value) return;
  
  try {
    isDeleting.value = true;
    
    const response = await api.delete(`/api/transactions/${currentTransaction.value._id}`);
    
    if (response.success) {
      showDeleteModal.value = false;
      loadTransactions();
    }
  } catch (error) {
    console.error('删除交易错误:', error);
  } finally {
    isDeleting.value = false;
  }
};

// 初始加载
onMounted(() => {
  loadCategories();
  loadTransactions();
});
</script> 