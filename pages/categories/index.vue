<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold">账单类型管理</h2>
      <UButton color="primary" icon="i-heroicons-plus" @click="showAddModal = true">
        添加类别
      </UButton>
    </div>
    
    <!-- 类别层级导航 -->
    <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
      <UBreadcrumb :items="breadcrumbs" class="mb-4" @click="handleBreadcrumbClick" />
      
      <div class="flex space-x-2">
        <UBadge color="gray" variant="soft" v-if="currentLevel > 1">
          当前层级: {{ currentLevel }}
        </UBadge>
        <UBadge color="gray" variant="soft" v-if="currentParent">
          父类别: {{ currentParentName }}
        </UBadge>
      </div>
    </div>
    
    <!-- 类别列表 -->
    <div class="bg-white rounded-lg shadow-sm overflow-hidden">
      <UTable 
        :columns="columns" 
        :rows="categories" 
        :loading="isLoading"
        :empty-state="{ icon: 'i-heroicons-tag', label: '暂无类别' }"
      >
        <template #actions-data="{ row }">
          <div class="flex">
            <UButton
              v-if="row.level < 3"
              color="blue"
              variant="ghost"
              icon="i-heroicons-arrows-right-left"
              size="xs"
              @click="viewSubCategories(row)"
              class="mr-1"
              :disabled="isLoading"
            />
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-pencil-square"
              size="xs"
              @click="editCategory(row)"
              class="mr-1"
              :disabled="isLoading"
            />
            <UButton
              color="red"
              variant="ghost"
              icon="i-heroicons-trash"
              size="xs"
              @click="confirmDelete(row)"
              :disabled="isLoading"
            />
          </div>
        </template>
        
        <template #level-data="{ row }">
          <UBadge :color="getLevelColor(row.level)">
            {{ `第${row.level}级` }}
          </UBadge>
        </template>
      </UTable>
    </div>
    
    <!-- 添加/编辑类别弹窗 -->
    <UModal v-model="showAddModal">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100' }">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-base font-semibold">
              {{ isEditing ? '编辑类别' : '添加类别' }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="closeModal"
            />
          </div>
        </template>
        
        <UForm :state="formState" class="space-y-4 py-2" @submit="saveCategory">
          <UFormGroup label="名称" name="name">
            <UInput v-model="formState.name" placeholder="请输入类别名称" />
          </UFormGroup>
          
          <UFormGroup v-if="!isEditing" label="父类别">
            <USelect
              v-model="formState.parentId"
              :options="parentOptions"
              placeholder="无 (顶级类别)"
              clearable
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
              @click="saveCategory"
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
          确定要删除此类别吗？该操作无法撤销。
          <div v-if="deleteErrorMessage" class="mt-2 text-red-500">
            {{ deleteErrorMessage }}
          </div>
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="showDeleteModal = false">
              取消
            </UButton>
            <UButton
              color="red"
              :loading="isDeleting"
              @click="deleteCategory"
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
    key: 'name',
    label: '名称',
  },
  {
    key: 'level',
    label: '层级',
  },
  {
    key: 'actions',
    label: '操作',
  },
];

// 状态变量
const categories = ref([]);
const parentCategories = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const formState = ref({
  name: '',
  parentId: null,
});
const isEditing = ref(false);
const currentCategory = ref(null);
const currentLevel = ref(1);
const currentParent = ref(null);
const currentParentName = ref('');
const breadcrumbs = ref([
  {
    label: '所有类别',
    to: '#',
    icon: 'i-heroicons-home',
  },
]);
const deleteErrorMessage = ref('');

// 父类别选项
const parentOptions = computed(() => {
  return parentCategories.value.map(category => ({
    label: category.name,
    value: category._id,
  }));
});

// 根据层级获取颜色
const getLevelColor = (level) => {
  switch (level) {
    case 1:
      return 'green';
    case 2:
      return 'blue';
    case 3:
      return 'purple';
    default:
      return 'gray';
  }
};

// 加载类别列表
const loadCategories = async () => {
  try {
    isLoading.value = true;
    
    const params = {
      level: currentLevel.value,
    };
    
    if (currentParent.value) {
      params.parentId = currentParent.value;
    } else {
      params.parentId = '';
    }
    
    const response = await api.get('/api/categories', params);
    
    if (response.success) {
      categories.value = response.data;
    }
  } catch (error) {
    console.error('加载类别错误:', error);
  } finally {
    isLoading.value = false;
  }
};

// 加载父类别选项
const loadParentOptions = async () => {
  try {
    // 对于新的一级类别，不需要父类别选项
    if (currentLevel.value === 1 && !isEditing.value) {
      parentCategories.value = [];
      return;
    }
    
    // 获取可作为父类别的类别列表（当前层级-1的类别）
    const response = await api.get('/api/categories', {
      level: currentLevel.value - 1,
    });
    
    if (response.success) {
      parentCategories.value = response.data;
    }
  } catch (error) {
    console.error('加载父类别错误:', error);
  }
};

// 查看子类别
const viewSubCategories = (category) => {
  currentLevel.value = category.level + 1;
  currentParent.value = category._id;
  currentParentName.value = category.name;
  
  // 更新面包屑
  breadcrumbs.value = [
    {
      label: '所有类别',
      to: '#',
      icon: 'i-heroicons-home',
    },
  ];
  
  // 添加当前层级路径
  if (category.level >= 1) {
    breadcrumbs.value.push({
      label: category.name,
      to: '#',
    });
  }
  
  loadCategories();
  loadParentOptions();
};

// 处理面包屑点击
const handleBreadcrumbClick = (item) => {
  if (item.label === '所有类别') {
    // 回到顶级类别
    currentLevel.value = 1;
    currentParent.value = null;
    currentParentName.value = '';
    
    breadcrumbs.value = [
      {
        label: '所有类别',
        to: '#',
        icon: 'i-heroicons-home',
      },
    ];
  }
  
  loadCategories();
  loadParentOptions();
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
    name: '',
    parentId: null,
  };
  currentCategory.value = null;
};

// 编辑类别
const editCategory = (category) => {
  isEditing.value = true;
  currentCategory.value = category;
  
  formState.value = {
    name: category.name,
    parentId: category.parentId,
  };
  
  showAddModal.value = true;
};

// 保存类别
const saveCategory = async () => {
  try {
    isSaving.value = true;
    
    if (!formState.value.name) {
      // 简单的前端验证
      return;
    }
    
    const data = {
      name: formState.value.name,
    };
    
    if (!isEditing.value) {
      // 添加新类别时设置父类别
      data.parentId = formState.value.parentId || null;
    }
    
    let response;
    
    if (isEditing.value && currentCategory.value) {
      response = await api.put(`/api/categories/${currentCategory.value._id}`, data);
    } else {
      response = await api.post('/api/categories', data);
    }
    
    if (response.success) {
      closeModal();
      loadCategories();
    }
  } catch (error) {
    console.error('保存类别错误:', error);
  } finally {
    isSaving.value = false;
  }
};

// 确认删除
const confirmDelete = (category) => {
  currentCategory.value = category;
  deleteErrorMessage.value = '';
  showDeleteModal.value = true;
};

// 删除类别
const deleteCategory = async () => {
  if (!currentCategory.value) return;
  
  try {
    isDeleting.value = true;
    deleteErrorMessage.value = '';
    
    const response = await api.delete(`/api/categories/${currentCategory.value._id}`);
    
    if (response.success) {
      showDeleteModal.value = false;
      loadCategories();
    }
  } catch (error) {
    console.error('删除类别错误:', error);
    deleteErrorMessage.value = error.data?.statusMessage || '删除失败，该类别可能有子类别或关联的交易记录';
  } finally {
    isDeleting.value = false;
  }
};

// 初始加载
onMounted(() => {
  loadCategories();
});
</script> 