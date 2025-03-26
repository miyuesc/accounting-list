<template>
  <div class="category-tree">
    <template v-if="categories.length === 0">
      <div class="text-gray-500 italic text-sm">没有类别数据</div>
    </template>
    
    <template v-else>
      <div v-for="category in categories" :key="category._id" class="mb-1">
        <div class="flex items-center p-1.5 rounded-md hover:bg-gray-50/80 group transition-all duration-150">
          <!-- 展开/折叠图标 -->
          <button
            v-if="hasChildren(category)"
            class="mr-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-150"
            @click="toggleCollapse(category._id)"
          >
            <UIcon 
              :name="isCollapsed(category._id) ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-down'" 
              class="w-3.5 h-3.5" 
            />
          </button>
          <span v-else class="mr-1 w-3.5"></span>
          
          <!-- 类别类型图标 -->
          <span :class="getCategoryIconColor(category)" class="mr-1.5">
            <UIcon :name="getCategoryIcon(category)" class="w-3.5 h-3.5" />
          </span>
          
          <!-- 类别名称和子类别数量 -->
          <div class="flex items-center flex-1 min-w-0">
            <span class="font-medium text-sm truncate">{{ category.name }}</span>
            <span 
              v-if="hasChildren(category)"
              class="ml-2 text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 whitespace-nowrap"
            >
              {{ category.children.length }}
            </span>
          </div>
          
          <!-- 操作按钮组 -->
          <div class="ml-2 flex opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <!-- 查看子类别按钮 -->
            <button
              v-if="hasChildren(category)"
              class="mr-1 text-blue-500 hover:text-blue-600 p-1 rounded transition-colors duration-150"
              @click="$emit('view-sub', category)"
            >
              <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5" />
            </button>
            
            <!-- 编辑按钮 -->
            <button
              class="mr-1 text-gray-500 hover:text-gray-600 p-1 rounded transition-colors duration-150"
              @click="$emit('edit', category)"
            >
              <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
            </button>
            
            <!-- 删除按钮 -->
            <button
              class="text-red-500 hover:text-red-600 p-1 rounded transition-colors duration-150"
              @click="$emit('delete', category)"
            >
              <UIcon name="i-heroicons-trash" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <!-- 子类别 -->
        <div
          v-if="hasChildren(category) && !isCollapsed(category._id)"
          class="ml-4 border-l border-gray-100 pl-3 mt-1"
        >
          <CategoryTree
            :categories="category.children"
            @view-sub="$emit('view-sub', $event)"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 定义 props
const props = defineProps({
  categories: {
    type: Array,
    required: true,
    validator: (value) => {
      if (!Array.isArray(value)) {
        console.error('CategoryTree: categories prop must be an array');
        return false;
      }
      return true;
    }
  }
});

// 定义事件
defineEmits(['view-sub', 'edit', 'delete']);

// 存储折叠状态
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

// 检查是否有子类别
const hasChildren = (category) => {
  return Array.isArray(category.children) && category.children.length > 0;
};

// 获取类别图标
const getCategoryIcon = (category) => {
  if (category.type === 'income') {
    return hasChildren(category) ? 'i-heroicons-banknotes' : 'i-heroicons-arrow-trending-up';
  } else {
    return hasChildren(category) ? 'i-heroicons-shopping-bag' : 'i-heroicons-arrow-trending-down';
  }
};

// 获取类别图标颜色
const getCategoryIconColor = (category) => {
  return category.type === 'income' ? 'text-green-500' : 'text-red-500';
};
</script>

<style scoped>
.category-tree {
  font-size: 0.875rem;
}

.category-tree :deep(.category-tree) {
  margin-top: 0.25rem;
}
</style>