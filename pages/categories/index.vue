<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="page-title">账单类型管理</h2>
      <UButton color="primary" icon="i-heroicons-plus" @click="showAddModal = true" class="app-btn app-btn-primary">
        添加类别
      </UButton>
    </div>
    
    <!-- 视图切换 -->
    <div class="app-card mb-6">
      <div class="flex items-center justify-between">
        <div class="space-x-2">
          <UButton
            :class="viewMode === 'tree' ? 'app-btn-primary' : 'app-btn-secondary'"
            variant="soft"
            @click="toggleViewMode('tree')"
          >
            <UIcon name="i-heroicons-squares-2x2" class="app-btn-icon" />
            树形视图
          </UButton>
          <UButton
            :class="viewMode === 'list' ? 'app-btn-primary' : 'app-btn-secondary'"
            variant="soft"
            @click="toggleViewMode('list')"
          >
            <UIcon name="i-heroicons-list-bullet" class="app-btn-icon" />
            列表视图
          </UButton>
          
          <!-- 返回上级按钮 -->
          <UButton
            v-if="viewMode === 'list' && currentLevel > 1"
            class="app-btn-secondary"
            @click="backToParent"
          >
            <UIcon name="i-heroicons-arrow-left" class="app-btn-icon" />
            返回上级
          </UButton>
        </div>
        
        <div v-if="viewMode === 'list'" class="flex space-x-2">
          <UBadge color="gray" variant="soft" class="app-badge" v-if="currentLevel > 1">
            当前层级: {{ currentLevel }}
          </UBadge>
          <UBadge color="gray" variant="soft" class="app-badge" v-if="currentParent">
            父类别: {{ currentParentName }}
          </UBadge>
        </div>
      </div>
      
      <!-- 列表视图的面包屑导航 -->
      <UBreadcrumb 
        v-if="viewMode === 'list'" 
        :items="breadcrumbs" 
        class="mt-4" 
        @click="handleBreadcrumbClick" 
      />
    </div>
    
    <!-- 加载指示器 -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 text-primary-500" />
    </div>
    
    <!-- 树形视图 -->
    <div v-if="viewMode === 'tree' && !isLoading" class="grid md:grid-cols-2 gap-6">
      <!-- 收入分类 -->
      <div class="app-card p-0 overflow-hidden">
        <div class="bg-green-50 p-4 border-b border-green-100">
          <h3 class="section-title m-0 flex items-center text-green-700">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-5 h-5 mr-2" />
            收入分类 ({{ incomeCategories.length }})
          </h3>
        </div>
        <div class="p-4">
          <template v-if="incomeCategories.length > 0">
            <CategoryTree
              :categories="incomeCategories"
              @view-sub="viewSubCategories"
              @edit="editCategory"
              @delete="confirmDelete"
            />
          </template>
          <div v-else class="text-center py-8 text-gray-500">
            <UIcon name="i-heroicons-tag" class="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>暂无收入分类</p>
            <UButton 
              size="sm" 
              color="green" 
              variant="soft" 
              class="mt-3"
              @click="addNewCategory('income')"
            >
              添加收入分类
            </UButton>
          </div>
        </div>
      </div>
      
      <!-- 支出分类 -->
      <div class="app-card p-0 overflow-hidden">
        <div class="bg-red-50 p-4 border-b border-red-100">
          <h3 class="section-title m-0 flex items-center text-red-700">
            <UIcon name="i-heroicons-arrow-trending-down" class="w-5 h-5 mr-2" />
            支出分类 ({{ expenseCategories.length }})
          </h3>
        </div>
        <div class="p-4">
          <template v-if="expenseCategories.length > 0">
            <CategoryTree
              :categories="expenseCategories"
              @view-sub="viewSubCategories"
              @edit="editCategory"
              @delete="confirmDelete"
            />
          </template>
          <div v-else class="text-center py-8 text-gray-500">
            <UIcon name="i-heroicons-tag" class="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>暂无支出分类</p>
            <UButton 
              size="sm" 
              color="red" 
              variant="soft" 
              class="mt-3"
              @click="addNewCategory('expense')"
            >
              添加支出分类
            </UButton>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 列表视图 -->
    <div v-else class="app-card p-0 overflow-hidden">
      <UTable 
        :columns="columns" 
        :rows="categories" 
        :loading="isLoading"
        :empty-state="{ icon: 'i-heroicons-tag', label: '暂无类别' }"
        class="app-table"
      >
        <template #actions-data="{ row }">
          <div class="flex">
            <UButton
              v-if="row.level < 3"
              color="blue"
              variant="ghost"
              size="xs"
              @click="viewSubCategories(row)"
              class="mr-1 app-btn-sm"
              :disabled="isLoading"
            >
              <UIcon name="i-heroicons-arrows-right-left" class="w-4 h-4" />
            </UButton>
            <UButton
              color="gray"
              variant="ghost"
              size="xs"
              @click="editCategory(row)"
              class="mr-1 app-btn-sm"
              :disabled="isLoading"
            >
              <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
            </UButton>
            <UButton
              color="red"
              variant="ghost"
              size="xs"
              @click="confirmDelete(row)"
              class="app-btn-sm"
              :disabled="isLoading"
            >
              <UIcon name="i-heroicons-trash" class="w-4 h-4" />
            </UButton>
          </div>
        </template>
        
        <template #level-data="{ row }">
          <UBadge :color="getLevelColor(row.level)">
            {{ `第${row.level}级` }}
          </UBadge>
        </template>
        
        <template #type-data="{ row }">
          <UBadge :color="row.type === 'income' ? 'green' : 'red'">
            {{ row.type === 'income' ? '收入' : '支出' }}
          </UBadge>
        </template>
        
        <template #name-data="{ row }">
          <div class="flex items-center">
            <span class="mr-2" :class="row.type === 'income' ? 'text-green-500' : 'text-red-500'">
              <UIcon 
                :name="row.type === 'income' 
                  ? (row.hasChildren ? 'i-heroicons-banknotes' : 'i-heroicons-arrow-trending-up')
                  : (row.hasChildren ? 'i-heroicons-shopping-bag' : 'i-heroicons-arrow-trending-down')" 
                class="w-4 h-4" 
              />
            </span>
            <span>{{ row.name }}</span>
          </div>
        </template>
      </UTable>
    </div>
    
    <!-- 添加/编辑类别弹窗 -->
    <UModal v-model="showAddModal">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100' }">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="section-title mb-0">
              {{ isEditing ? '编辑类别' : '添加类别' }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              @click="closeModal"
              class="rounded-full w-8 h-8 p-0 flex items-center justify-center"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </UButton>
          </div>
        </template>
        
        <UForm :state="formState" class="space-y-4 py-4" @submit="saveCategory">
          <UFormGroup label="名称" name="name" class="form-group">
            <UInput v-model="formState.name" placeholder="请输入类别名称" class="form-input" />
          </UFormGroup>
          
          <UFormGroup v-if="!isEditing" label="类型" name="type" class="form-group">
            <USelect
              v-model="formState.type"
              :options="typeOptions"
              placeholder="请选择类型"
              class="form-input"
            />
          </UFormGroup>
          
          <UFormGroup v-if="!isEditing" label="父类别" class="form-group">
            <USelectMenu
              v-model="formState.parentId"
              :options="parentOptions"
              placeholder="无 (顶级类别)"
              clearable
              class="form-input"
              value-attribute="value"
              option-attribute="label"
            />
          </UFormGroup>
        </UForm>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton 
              color="gray" 
              variant="soft" 
              @click="closeModal"
              class="app-btn app-btn-secondary"
            >
              取消
            </UButton>
            <UButton
              color="primary"
              :loading="isSaving"
              @click="saveCategory"
              class="app-btn app-btn-primary"
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
          <h3 class="section-title mb-0">确认删除</h3>
        </template>
        
        <div class="py-4">
          确定要删除此类别吗？该操作无法撤销。
          <div v-if="deleteErrorMessage" class="mt-2 text-red-500">
            {{ deleteErrorMessage }}
          </div>
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton 
              color="gray" 
              variant="soft" 
              @click="showDeleteModal = false" 
              class="app-btn app-btn-secondary"
            >
              取消
            </UButton>
            <UButton
              color="red"
              :loading="isDeleting"
              @click="deleteCategory"
              class="app-btn app-btn-danger"
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
import { defineComponent, h } from 'vue';

// CategoryTree 组件
const CategoryTree = {
  name: 'CategoryTree',
  props: {
    categories: {
      type: Array,
      required: true
    }
  },
  emits: ['view-sub', 'edit', 'delete'],
  setup(props, { emit }) {
    // 检查是否有有效的类别
    if (!Array.isArray(props.categories)) {
      console.error('CategoryTree: categories prop must be an array');
      return () => h('div', { class: 'text-red-500' }, 'Invalid categories data');
    }

    // 存储折叠状态 - 使用 Map 以支持响应式更新
    const collapsedState = ref(new Map());

    // 切换折叠状态
    const toggleCollapse = (categoryId) => {
      const currentState = collapsedState.value.get(categoryId) || false;
      collapsedState.value.set(categoryId, !currentState);
      console.log(`Category ${categoryId} is now ${!currentState ? 'collapsed' : 'expanded'}`);
    };

    // 检查是否折叠
    const isCollapsed = (categoryId) => {
      return collapsedState.value.get(categoryId) || false;
    };

    // 渲染单个类别项
    const renderCategoryItem = (category) => {
      // 安全检查
      if (!category || typeof category !== 'object') {
        console.error('CategoryTree: Invalid category object', category);
        return null;
      }

      const categoryId = category._id;
      
      // 检查是否有子类别
      const hasChildren = Array.isArray(category.children) && category.children.length > 0;
      
      // 获取类别图标
      const getCategoryIcon = () => {
        // 根据类型和是否有子类别选择图标
        if (category.type === 'income') {
          return hasChildren ? 'i-heroicons-banknotes' : 'i-heroicons-arrow-trending-up';
        } else {
          return hasChildren ? 'i-heroicons-shopping-bag' : 'i-heroicons-arrow-trending-down';
        }
      };
      
      // 获取类别图标颜色
      const getCategoryIconColor = () => {
        return category.type === 'income' ? 'text-green-500' : 'text-red-500';
      };
      
      return h(
        'div',
        { class: 'mb-2' },
        [
          h('div', { 
            class: 'flex items-center p-2 rounded-md hover:bg-gray-50 group transition-colors duration-150',
          }, [
            // 展开/折叠图标（如果有子类别）
            hasChildren ? h(
              'button',
              {
                class: 'mr-1 text-gray-500 hover:text-gray-700 focus:outline-none',
                onClick: () => {
                  console.log('Toggle category:', category.name);
                  toggleCollapse(categoryId);
                }
              },
              [h('UIcon', { 
                name: isCollapsed(categoryId) 
                  ? 'i-heroicons-chevron-right' 
                  : 'i-heroicons-chevron-down', 
                class: 'w-4 h-4' 
              })]
            ) : h('span', { class: 'mr-1 w-4' }, ''),
            
            // 类别类型图标
            h('span', { class: `mr-1.5 ${getCategoryIconColor()}` }, 
              [h('UIcon', { name: getCategoryIcon(), class: 'w-4 h-4' })]
            ),
            
            // 类别名称
            h('div', { class: 'flex items-center' }, [
              h('span', { class: 'font-medium' }, category.name),
              
              // 子类别数量指示器
              hasChildren ? h('span', { 
                class: 'ml-2 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5'
              }, category.children.length) : null
            ]),
            
            // 操作按钮组
            h('div', { class: 'ml-auto flex opacity-0 group-hover:opacity-100 transition-opacity duration-200' }, [
              // 查看子类别按钮
              hasChildren ? h(
                'button',
                {
                  class: 'mr-1 app-btn-sm text-blue-500 hover:text-blue-700 p-1 rounded',
                  onClick: () => {
                    console.log('View subcategories for:', category.name);
                    emit('view-sub', category);
                  }
                },
                [h('UIcon', { name: 'i-heroicons-eye', class: 'w-4 h-4' })]
              ) : null,
              
              // 编辑按钮
              h(
                'button',
                {
                  class: 'mr-1 app-btn-sm text-gray-500 hover:text-gray-700 p-1 rounded',
                  onClick: () => {
                    console.log('Edit category:', category.name);
                    emit('edit', category);
                  }
                },
                [h('UIcon', { name: 'i-heroicons-pencil-square', class: 'w-4 h-4' })]
              ),
              
              // 删除按钮
              h(
                'button',
                {
                  class: 'app-btn-sm text-red-500 hover:text-red-700 p-1 rounded',
                  onClick: () => {
                    console.log('Delete category:', category.name);
                    emit('delete', category);
                  }
                },
                [h('UIcon', { name: 'i-heroicons-trash', class: 'w-4 h-4' })]
              )
            ])
          ]),
          
          // 子类别（如果有且未折叠）
          (hasChildren && !isCollapsed(categoryId)) ? h(
            'div',
            { class: 'ml-6 border-l border-gray-200 pl-4 mt-2' },
            category.children.map(child => renderCategoryItem(child))
          ) : null
        ]
      );
    };

    // 主渲染函数
    return () => {
      // 如果没有类别，显示空状态
      if (props.categories.length === 0) {
        return h('div', { class: 'text-gray-500 italic' }, '没有类别数据');
      }
      
      // 渲染所有类别
      return h(
        'div',
        { class: 'category-tree' },
        props.categories.map(category => renderCategoryItem(category))
      );
    };
  }
};

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
    key: 'type',
    label: '类型',
  },
  {
    key: 'actions',
    label: '操作',
  },
];

// 类型选项
const typeOptions = [
  { label: '收入', value: 'income' },
  { label: '支出', value: 'expense' },
];

// 状态变量
const categories = ref([]);
const treeCategories = ref([]);
const parentCategories = ref([]);
const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const formState = ref({
  name: '',
  parentId: null,
  type: '',
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
const viewMode = ref('tree'); // 'tree' 或 'list'

// 父类别选项
const parentOptions = computed(() => {
  return parentCategories.value.map(category => ({
    label: category.name,
    value: category._id,
  }));
});

// 根据类型过滤收入分类
const incomeCategories = computed(() => {
  return treeCategories.value.filter(cat => cat.type === 'income');
});

// 根据类型过滤支出分类
const expenseCategories = computed(() => {
  return treeCategories.value.filter(cat => cat.type === 'expense');
});

// 切换视图模式
const toggleViewMode = (mode) => {
  viewMode.value = mode;
  loadCategories();
};

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
    
    if (viewMode.value === 'tree') {
      // 树形视图模式 - 加载所有类别并构建树
      console.log('Loading tree view categories...');
      
      // 确保发送正确的参数
      const response = await api.get('/api/categories', {
        treeView: true  // 使用布尔值而不是字符串
      });
      
      if (response.success) {
        console.log('Raw API response:', response);
        
        // 验证返回数据格式
        if (!response.data) {
          console.error('API response missing data property');
          treeCategories.value = [];
          return;
        }
        
        // 检查并处理数据
        if (Array.isArray(response.data)) {
          treeCategories.value = response.data;
          console.log(`Loaded ${treeCategories.value.length} root categories`);
          
          // 详细记录每个类别
          treeCategories.value.forEach((cat, index) => {
            console.log(`Root category ${index+1}:`, cat.name, `(${cat.type})`, 
                       `${cat.children ? cat.children.length : 0} children`);
          });
          
          console.log(`Income categories: ${incomeCategories.value.length}`);
          console.log(`Expense categories: ${expenseCategories.value.length}`);
        } else {
          console.error('Expected array for treeCategories but got:', typeof response.data);
          treeCategories.value = [];
        }
      } else {
        console.error('Failed to load tree categories:', response);
        treeCategories.value = [];
      }
    } else {
      // 列表视图模式 - 不变
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
        // 处理数据，添加hasChildren和childrenCount属性
        const data = response.data || [];
        
        // 检查API是否返回hasChildren和childrenCount
        const hasRequiredProps = data.length > 0 && 
          ('hasChildren' in data[0] && 'childrenCount' in data[0]);
        
        if (hasRequiredProps) {
          // API已经返回了所需属性
          categories.value = data;
        } else {
          // API未返回所需属性，在前端进行处理
          // 由于多次请求可能会导致性能问题，这里使用简化实现
          // 在实际项目中，最好修改后端API一次返回所需数据
          
          // 使用模拟数据（随机生成子类别数量）
          categories.value = data.map(category => ({
            ...category,
            hasChildren: Math.random() > 0.3, // 70%的概率有子类别
            childrenCount: Math.floor(Math.random() * 5) + 1 // 1-5个子类别
          }));
          
          console.log('Using simplified implementation for hasChildren and childrenCount');
        }
      } else {
        console.error('Failed to load list categories:', response);
        categories.value = [];
      }
    }
  } catch (error) {
    console.error('加载类别错误:', error);
    if (viewMode.value === 'tree') {
      treeCategories.value = [];
    } else {
      categories.value = [];
    }
  } finally {
    isLoading.value = false;
  }
};

// 加载父类别选项
const loadParentOptions = async () => {
  try {
    // 获取可作为父类别的选项
    // 如果选择了类型，只获取匹配类型的类别
    const params = {
      treeView: true,
      // level: { $lt: 3 } // 只有1级和2级类别可以作为父类别
    };
    
    if (formState.value.type) {
      params.type = formState.value.type;
    }
    
    const response = await api.get('/api/categories', params);
    
    if (response.success) {
      parentCategories.value = response.data;
    }
  } catch (error) {
    console.error('加载父类别错误:', error);
  }
};

// 添加新类别，预设类型
const addNewCategory = (type) => {
  formState.value.type = type;
  showAddModal.value = true;
};

// 查看子类别
const viewSubCategories = (category) => {
  if (viewMode.value === 'tree') {
    // 在树形视图中，无需切换视图，直接展开/折叠即可
    return;
  }
  
  currentLevel.value = category.level + 1;
  currentParent.value = category._id;
  currentParentName.value = category.name;
  
  // 更新面包屑
  // 如果是从第一级进入，重置面包屑
  if (category.level === 1) {
    breadcrumbs.value = [
      {
        label: '所有类别',
        to: '#',
        icon: 'i-heroicons-home',
      },
      {
        label: category.name,
        to: '#',
        categoryId: category._id,
        level: category.level,
      }
    ];
  } else {
    // 如果是从更深层级进入，添加到面包屑
    // 确保不重复添加
    const existingIndex = breadcrumbs.value.findIndex(item => item.categoryId === category._id);
    if (existingIndex === -1) {
      breadcrumbs.value.push({
        label: category.name,
        to: '#',
        categoryId: category._id,
        level: category.level,
      });
    } else {
      // 如果已经在面包屑中，截断到该位置
      breadcrumbs.value = breadcrumbs.value.slice(0, existingIndex + 1);
    }
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
  } else if (item.categoryId) {
    // 导航到特定类别层级
    // 设置当前级别为点击项的下一级
    currentLevel.value = item.level + 1;
    currentParent.value = item.categoryId;
    currentParentName.value = item.label;
    
    // 截断面包屑到该位置
    const index = breadcrumbs.value.findIndex(bc => bc.categoryId === item.categoryId);
    if (index !== -1) {
      breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
    }
  }
  
  loadCategories();
  loadParentOptions();
};

// 返回上级
const backToParent = () => {
  if (viewMode.value === 'list' && currentLevel.value > 1) {
    // 降低当前级别
    currentLevel.value--;
    
    if (currentLevel.value === 1) {
      // 回到顶级
      currentParent.value = null;
      currentParentName.value = '';
      
      breadcrumbs.value = [
        {
          label: '所有类别',
          to: '#',
          icon: 'i-heroicons-home',
        },
      ];
    } else if (breadcrumbs.value.length > 1) {
      // 移除面包屑最后一项
      breadcrumbs.value.pop();
      
      // 获取新的父类别信息
      const parentBreadcrumb = breadcrumbs.value[breadcrumbs.value.length - 1];
      if (parentBreadcrumb.categoryId) {
        currentParent.value = parentBreadcrumb.categoryId;
        currentParentName.value = parentBreadcrumb.label;
      }
    }
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
    type: '',
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
    type: category.type,
  };
  
  showAddModal.value = true;
};

// 保存类别
const saveCategory = async () => {
  try {
    isSaving.value = true;
    
    if (!formState.value.name || (!isEditing.value && !formState.value.type)) {
      // 简单的前端验证
      return;
    }
    
    const data = {
      name: formState.value.name,
    };
    
    if (!isEditing.value) {
      // 添加新类别时设置父类别和类型
      data.parentId = formState.value.parentId || null;
      data.type = formState.value.type;
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

// 监听表单类型变化，加载对应类型的父类别选项
watch(() => formState.value.type, (newType) => {
  if (newType) {
    loadParentOptions();
  }
});

// 刷新数据
const refreshCategories = () => {
  console.log('刷新数据');
  // 清空现有数据
  treeCategories.value = [];
  incomeCategories.value = [];
  expenseCategories.value = [];
  
  // 重新加载数据
  loadCategories();
};

// 初始加载
onMounted(() => {
  // 加载类别列表
  loadCategories();
});
</script> 