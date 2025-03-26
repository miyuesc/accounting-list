<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">交易记录列表</h2>
      <div class="flex space-x-2">
        <UButton color="primary" @click="showAddModal = true">
          添加交易
        </UButton>
        <UButton color="gray" @click="showImportModal = true">
          <UIcon name="i-heroicons-arrow-up-tray" class="mr-1" />
          导入Excel
        </UButton>
      </div>
    </div>
    
    <!-- 过滤器 -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UFormGroup label="类型">
          <USelectMenu
            v-model="filters.type"
            :options="typeOptions"
            placeholder="全部"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormGroup>
        
        <UFormGroup label="类别">
          <USelectMenu
            v-model="filters.categoryId"
            :options="filteredCategoryOptions"
            placeholder="全部"
            value-attribute="value"
            option-attribute="label"
          />
        </UFormGroup>
        
        <UFormGroup label="日期范围">
          <div class="flex space-x-2">
            <UInput v-model="filters.startDate" type="date" placeholder="开始日期" />
            <span class="self-center">至</span>
            <UInput v-model="filters.endDate" type="date" placeholder="结束日期" />
          </div>
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
          show-first
          show-last
          :page-count="pagination.limit || 1"
          :total="pagination.total"
          @update:model-value="loadTransactions"
        />
      </div>
    </div>
    
    <!-- 交易表单弹窗 -->
    <TransactionForm
      v-model="showAddModal"
      :is-editing="isEditing"
      :transaction="currentTransaction"
      :category-options="categoryOptions"
      @submit="handleTransactionSubmit"
      @close="handleTransactionClose"
    />
    
    <!-- 删除确认弹窗 -->
    <DeleteConfirm
      v-model="showDeleteModal"
      :transaction-id="currentTransaction?._id || ''"
      @success="handleDeleteSuccess"
    />
    
    <!-- 导入交易弹窗 -->
    <ImportTransactions
      v-model="showImportModal"
      @success="handleImportSuccess"
    />

    <!-- 继续添加确认弹窗 -->
    <UModal v-model="showContinueModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">继续添加</h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="showContinueModal = false" />
          </div>
        </template>
        
        <div class="py-4">
          是否继续添加新的交易记录？
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="showContinueModal = false">
              取消
            </UButton>
            <UButton color="primary" @click="handleContinueAdd">
              继续添加
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watchEffect } from 'vue';
import dayjs from 'dayjs';
import { api } from '~/utils/api';
import TransactionForm from '~/components/transactions/TransactionForm.vue';
import ImportTransactions from '~/components/transactions/ImportTransactions.vue';
import DeleteConfirm from '~/components/transactions/DeleteConfirm.vue';

// 设置页面标题
useHead({
  title: '交易记录',
  titleTemplate: '%s - 记账本'
});

// 类型定义
interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  categoryId: string | {
    _id: string;
    name: string;
    type: string;
  };
  amount: number;
  description: string;
  transactionDate: string;
  categoryName?: string;
}

interface Category {
  _id: string;
  name: string;
  type: string;
}

interface CategoryOption {
  label: string;
  value: string;
  type: string;
}

interface Filters {
  type: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  page: number;
  limit: number;
}

interface ImportResult {
  succeeded: number;
  failed: number;
  errors?: Array<{
    row: number;
    message: string;
    data: any;
  }>;
}

// 交易类型选项
const typeOptions = [
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' },
];

// 表格列定义
const columns = [
  {
    key: 'type',
    label: '类型',
  },
  {
    key: 'categoryName',
    label: '类别',
  },
  {
    key: 'amount',
    label: '金额',
  },
  {
    key: 'transactionDate',
    label: '日期',
  },
  {
    key: 'description',
    label: '备注',
  },
  {
    key: 'actions',
    label: '操作',
  },
];

// Toast消息
const toast = useToast();

// 状态变量
const isLoading = ref(false);
const isSubmitting = ref(false);
const isDeleting = ref(false);
const isImporting = ref(false);
const transactions = ref<Transaction[]>([]);
const categoryOptions = ref<CategoryOption[]>([]);
const totalCount = ref(0);
const currentTransaction = ref<Transaction | null>(null);
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const showImportModal = ref(false);
const importResults = ref<ImportResult | null>(null);
const importFile = ref<File | null>(null);
const isEditing = ref(false);
const showContinueModal = ref(false);

// 分页状态
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  pages: 1
});

// 过滤和分页状态
const filters = ref<Filters>({
  type: '',
  categoryId: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 10,
});

// 表单状态
const formState = ref({
  type: 'expense',
  categoryId: '',
  amount: 0,
  description: '',
  transactionDate: dayjs().format('YYYY-MM-DD'),
});

// 添加计算属性，根据选择的类型筛选类别
const filteredCategoryOptions = computed(() => {
  const allCategories = categoryOptions.value;
  
  if (!filters.value.type || allCategories.length === 0) {
    return allCategories;
  }
  
  return allCategories.filter(category => {
    return category.type === filters.value.type;
  });
});

// 修改表单中的类别计算属性
const formCategoryOptions = computed(() => {
  const allCategories = categoryOptions.value;
  
  if (!formState.value.type || allCategories.length === 0) {
    return allCategories;
  }
  
  return allCategories.filter(category => {
    return category.type === formState.value.type;
  });
});

// 格式化金额
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// 格式化日期
const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD');
};

// 重置过滤条件
const resetFilters = () => {
  filters.value = {
    ...filters.value,
    type: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    page: 1,
  };
  loadTransactions();
};

// 加载交易记录
const loadTransactions = async () => {
  try {
    isLoading.value = true;
    
    const response = await api.get<{
      success: boolean;
      pagination: any;
      data: {
        transactions: Transaction[];
        totalCount: number;
        page: number;
        limit: number;
      };
    }>('/api/transactions', filters.value);
    
    if (response.success) {
      transactions.value = response.data.transactions.map(t => ({
        ...t,
        categoryName: typeof t.categoryId === 'object' ? t.categoryId.name : ''
      }));
      
      // 更新分页信息
      pagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('加载交易记录错误:', error);
    toast.add({
      title: '加载失败',
      description: '加载交易记录时发生错误',
      color: 'red'
    });
  } finally {
    isLoading.value = false;
  }
};

// 加载类别
const loadCategories = async () => {
  try {
    const response = await api.get<{
      success: boolean;
      data: Category[];
    }>('/api/categories');
    
    if (response.success) {
      categoryOptions.value = response.data.map(category => ({
        label: category.name,
        value: category._id,
        type: category.type
      }));
    }
  } catch (error) {
    console.error('加载类别错误:', error);
    toast.add({
      title: '加载失败',
      description: '加载类别时发生错误',
      color: 'red'
    });
  }
};

// 编辑交易
const editTransaction = (transaction: Transaction) => {
  isEditing.value = true;
  currentTransaction.value = transaction;
  showAddModal.value = true;
};

// 确认删除
const confirmDelete = (transaction: Transaction) => {
  currentTransaction.value = transaction;
  showDeleteModal.value = true;
};

// 处理交易提交
const handleTransactionSubmit = async (data: any) => {
  try {
    let response;
    
    if (isEditing.value && currentTransaction.value) {
      response = await api.put<{
        success: boolean;
        data: Transaction;
      }>(`/api/transactions/${currentTransaction.value._id}`, data);
    } else {
      response = await api.post<{
        success: boolean;
        data: Transaction;
      }>('/api/transactions', data);
    }
    
    if (response.success) {
      loadTransactions();
      toast.add({
        title: '保存成功',
        color: 'green'
      });
      
      // 如果不是编辑模式，询问是否继续添加
      if (!isEditing.value) {
        showContinueModal.value = true;
      } else {
        showAddModal.value = false;
      }
    }
  } catch (error) {
    console.error('保存交易错误:', error);
    toast.add({
      title: '保存失败',
      description: '保存交易记录时发生错误',
      color: 'red'
    });
  }
};

// 处理交易表单关闭
const handleTransactionClose = () => {
  isEditing.value = false;
  currentTransaction.value = null;
};

// 处理删除成功
const handleDeleteSuccess = () => {
  loadTransactions();
};

// 监听类型变化
watchEffect(() => {
  if (formState.value.type) {
    formState.value.categoryId = '';
  }
});

// 监听筛选器类型变化
watchEffect(() => {
  if (filters.value.type) {
    filters.value.categoryId = '';
  }
});

// 初始加载
onMounted(() => {
  loadCategories();
  loadTransactions();
});

// 打开导入模态框
const openImportModal = () => {
  showImportModal.value = true;
  importResults.value = null;
  importFile.value = null;
};

// 处理文件变化
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    importFile.value = file;
  }
};

// 导入交易
const importTransactions = async () => {
  if (!importFile.value) {
    toast.add({
      title: '请选择文件',
      color: 'red'
    });
    return;
  }
  
  try {
    isImporting.value = true;
    
    const formData = new FormData();
    formData.append('file', importFile.value);
    
    const response = await api.post<{
      success: boolean;
      data: ImportResult;
    }>('/api/transactions/import', formData);
    
    if (response.success) {
      importResults.value = response.data;
      
      toast.add({
        title: '导入完成',
        description: `成功: ${response.data.succeeded}, 失败: ${response.data.failed}`,
        color: response.data.failed > 0 ? 'amber' : 'green'
      });
      
      loadTransactions();
    }
  } catch (error) {
    console.error('导入交易错误:', error);
    toast.add({
      title: '导入失败',
      description: error instanceof Error ? error.message : '导入Excel文件时发生错误',
      color: 'red'
    });
  } finally {
    isImporting.value = false;
  }
};

// 重置导入
const resetImport = () => {
  importResults.value = null;
  importFile.value = null;
  
  if (process.client) {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
};

// 处理导入成功
const handleImportSuccess = () => {
  loadTransactions();
};

// 处理继续添加
const handleContinueAdd = () => {
  showContinueModal.value = false;
  showAddModal.value = true;
};
</script> 