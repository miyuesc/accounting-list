<template>
  <UModal v-model="modelValue">
    <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100' }">
      <template #header>
        <h3 class="text-base font-semibold">确认删除</h3>
      </template>
      
      <div class="py-4">
        确定要删除这笔交易记录吗？该操作无法撤销。
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="gray" variant="soft" @click="closeModal">
            取消
          </UButton>
          <UButton
            color="red"
            :loading="isDeleting"
            @click="handleDelete"
          >
            删除
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from '~/utils/api';

interface Props {
  transactionId: string;
}

const modelValue = defineModel<boolean>('modelValue');

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'success'): void;
}>();

// Toast消息
const toast = useToast();

// 状态变量
const isDeleting = ref(false);

// 处理删除
const handleDelete = async () => {
  try {
    isDeleting.value = true;
    
    const response = await api.delete<{
      success: boolean;
      message?: string;
    }>(`/api/transactions/${props.transactionId}`);
    
    if (response.success) {
      closeModal();
      emit('success');
      toast.add({
        title: '删除成功',
        color: 'green'
      });
    }
  } catch (error) {
    console.error('删除交易错误:', error);
    toast.add({
      title: '删除失败',
      description: '删除交易记录时发生错误',
      color: 'red'
    });
  } finally {
    isDeleting.value = false;
  }
};

// 关闭弹窗
const closeModal = () => {
  modelValue.value = false;
};
</script> 