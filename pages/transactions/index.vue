<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">交易记录列表</h2>
      <div class="flex space-x-2">
        <UButton color="primary" @click="showAddModal = true">
          添加交易
        </UButton>
        <UButton color="gray" @click="openImportModal()">
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
          :page-count="pagination.pages || 1"
          :total="pagination.total"
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
            <USelectMenu
              v-model="formState.categoryId"
              :options="formCategoryOptions"
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
          
          <UFormGroup label="日期" name="transactionDate">
            <UInput v-model="formState.transactionDate" type="date" />
          </UFormGroup>
          
          <UFormGroup label="描述" name="description">
            <UTextarea v-model="formState.description" placeholder="请输入描述" />
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
    
    <!-- Excel导入模态框 -->
    <UModal v-model="showImportModal" :ui="{ width: 'sm:max-w-xl' }">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">导入Excel交易记录</h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="showImportModal = false" />
          </div>
        </template>
        
        <div v-if="!importResults">
          <p class="mb-4 text-gray-600">
            请上传包含交易记录的Excel文件。文件必须包含以下列：
          </p>
          
          <ul class="list-disc pl-5 mb-4 text-sm text-gray-600">
            <li>收入/支出 (必填，文本"收入"或"支出")</li>
            <li>金额 (必填，数值)</li>
            <li>日期 (必填，日期格式)</li>
            <li>父级类别 (必填，文本)</li>
            <li>子级类别 (可选，文本)</li>
            <li>备注 (可选，文本)</li>
          </ul>
          
          <div class="mb-4">
            <UFormGroup label="Excel文件">
              <UInput 
                type="file" 
                accept=".xlsx,.xls" 
                @change="handleFileChange"
                class="py-2" 
              />
            </UFormGroup>
          </div>
          
          <p class="text-xs text-gray-500 mb-4">
            注意：系统会自动创建不存在的类别，并建立正确的父子关系。
          </p>
        </div>
        
        <div v-else>
          <div class="mb-4">
            <div class="flex justify-between mb-2">
              <h4 class="font-medium">导入结果</h4>
              <div class="flex space-x-2">
                <span class="text-green-600">成功: {{ importResults.succeeded }}</span>
                <span class="text-red-600">失败: {{ importResults.failed }}</span>
              </div>
            </div>
            
            <!-- 失败记录列表 -->
            <div v-if="importResults.errors && importResults.errors.length > 0" class="mt-4">
              <h4 class="font-medium mb-2 text-red-600">错误详情:</h4>
              <div class="max-h-64 overflow-y-auto border rounded p-2">
                <div v-for="(error, index) in importResults.errors" :key="index" class="mb-2 text-sm">
                  <p class="mb-1"><span class="font-medium">行 {{ error.row }}:</span> {{ error.message }}</p>
                  <p class="text-gray-600 text-xs pl-4">数据: {{ error.data }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton 
              v-if="!importResults"
              color="primary"
              :loading="isImporting"
              :disabled="!importFile || isImporting"
              @click="importTransactions"
            >
              开始导入
            </UButton>
            <UButton 
              v-if="importResults"
              color="primary"
              @click="resetImport"
            >
              继续导入
            </UButton>
            <UButton 
              color="gray" 
              variant="soft" 
              @click="closeImportModal"
            >
              关闭
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useToast } from '@nuxt/ui/dist/runtime/composables/useToast';
import dayjs from 'dayjs';
import { api, getUserId } from '~/utils/api';

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
const transactions = ref([]);
const categoryOptions = ref([]);
const totalCount = ref(0);
const currentTransaction = ref(null);
const showAddModal = ref(false);
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showImportModal = ref(false);
const importResults = ref(null);
const importFile = ref(null);

// 过滤和分页状态
const filters = reactive({
  type: '',
  categoryId: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 10,
});

// 添加计算属性，根据选择的类型筛选类别
const filteredCategoryOptions = computed(() => {
  // 获取所有类别
  const allCategories = categoryOptions.value;
  
  // 如果没有选择类型或没有类别数据，返回全部
  if (!filters.type || allCategories.length === 0) {
    return allCategories;
  }
  
  // 根据选择的类型筛选
  return allCategories.filter(category => {
    // 假设每个类别对象中有 type 属性表示其类型
    // 如果您的类别对象结构不同，需要调整这里
    return category.type === filters.type;
  });
});

// 修改表单中的类别计算属性
const formCategoryOptions = computed(() => {
  // 获取所有类别
  const allCategories = categoryOptions.value;
  
  // 如果没有选择类型或没有类别数据，返回全部
  if (!formState.value.type || allCategories.length === 0) {
    return allCategories;
  }
  
  // 根据当前表单中选择的类型筛选
  return allCategories.filter(category => {
    return category.type === formState.value.type;
  });
});

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
  filters.type = '';
  filters.categoryId = '';
  filters.startDate = '';
  filters.endDate = '';
  filters.page = 1;
  loadTransactions();
};

// 加载交易记录
const loadTransactions = async () => {
  try {
    isLoading.value = true;
    
    const response = await api.get('/api/transactions', filters);
    
    if (response.success) {
      transactions.value = response.data.transactions?.map(t => ({
        ...t,
        categoryId: t.categoryId._id || t.categoryId,
        categoryName: t.categoryId.name
      }));
      totalCount.value = response.data.totalCount;
      filters.page = response.data.page;
      filters.limit = response.data.limit;
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
      console.log('获取到的类别数据:', response.data);
      
      categoryOptions.value = response.data.map(category => ({
        label: category.name,
        value: category._id,
        type: category.type // 保留类型信息
      }));
      
      console.log('处理后的类别选项:', categoryOptions.value);
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
  };
  
  // 确保在打开编辑对话框前已加载好对应类型的类别
  if (categoryOptions.value.length === 0) {
    loadCategories().then(() => {
      showAddModal.value = true;
    });
  } else {
    showAddModal.value = true;
  }
};

// 保存交易
const saveTransaction = async () => {
  try {
    isSubmitting.value = true;
    
    const data = {
      ...formState.value,
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
    isSubmitting.value = false;
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

// 监听类型变化
watch(() => formState.value.type, (newType) => {
  // 类型变化时清空类别选择
  formState.value.categoryId = '';
});

// 同样在筛选器中也监听类型变化
watch(() => filters.type, (newType) => {
  // 类型变化时清空类别选择
  filters.categoryId = '';
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
const handleFileChange = (event) => {
  const file = event.target.files[0];
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
    
    const response = await api.post('/api/transactions/import', formData);
    
    if (response.success) {
      importResults.value = response.data;
      
      // 显示导入结果摘要
      toast.add({
        title: '导入完成',
        description: `成功: ${response.data.succeeded}, 失败: ${response.data.failed}`,
        color: response.data.failed > 0 ? 'amber' : 'green'
      });
      
      // 刷新交易记录列表
      loadTransactions();
    }
  } catch (error) {
    console.error('导入交易错误:', error);
    toast.add({
      title: '导入失败',
      description: error.message || '导入Excel文件时发生错误',
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
  
  // 重置文件输入
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.value = '';
  }
};

// 关闭导入模态框
const closeImportModal = () => {
  showImportModal.value = false;
  resetImport();
};
</script> 