<template>
  <UModal v-model="modelValue">
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
      
      <UForm :state="formState" class="space-y-4 py-2" @submit="handleSubmit">
        <UFormGroup label="类型" name="type">
          <URadioGroup v-model="formState.type" :options="typeOptions" />
        </UFormGroup>
        
        <UFormGroup label="类别" name="categoryId">
          <USelectMenu
            v-model="formState.categoryId"
            :options="filteredCategoryOptions"
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
            :loading="isSubmitting"
            @click="handleSubmit"
          >
            保存
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import dayjs from 'dayjs';

interface Props {
  isEditing?: boolean;
  transaction?: {
    _id: string;
    type: 'income' | 'expense';
    categoryId: {
      _id: string;
      name: string;
      type: string;
    };
    amount: number;
    description: string;
    transactionDate: string;
  };
  categoryOptions: Array<{
    label: string;
    value: string;
    type: string;
  }>;
}


const modelValue = defineModel<boolean>('modelValue');

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
  transaction: undefined,
});

const emit = defineEmits<{
  (e: 'submit', data: any): void;
  (e: 'close'): void;
}>();

// 交易类型选项
const typeOptions = [
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' },
];

// Toast消息
const toast = useToast();

// 状态变量
const isSubmitting = ref(false);
const formState = ref({
  type: 'expense',
  categoryId: '',
  amount: 0,
  description: '',
  transactionDate: dayjs().format('YYYY-MM-DD'),
});

// 监听 transaction 变化，更新表单
watch(() => props.transaction, (newTransaction) => {
  if (newTransaction) {
    formState.value = {
      type: newTransaction.type,
      categoryId: newTransaction.categoryId._id,
      amount: newTransaction.amount,
      description: newTransaction.description,
      transactionDate: dayjs(newTransaction.transactionDate).format('YYYY-MM-DD'),
    };
  }
}, { immediate: true });

// 监听类型变化
watch(() => formState.value.type, () => {
  formState.value.categoryId = '';
});

// 添加计算属性，根据选择的类型筛选类别
const filteredCategoryOptions = computed(() => {
  if (!formState.value.type || !props.categoryOptions.length) {
    return props.categoryOptions;
  }
  
  return props.categoryOptions.filter(category => 
    category.type === formState.value.type
  );
});

// 关闭弹窗
const closeModal = () => {
  modelValue.value = false;
  emit('close');
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
};

// 处理提交
const handleSubmit = async () => {
  try {
    isSubmitting.value = true;
    emit('submit', { ...formState.value });
  } finally {
    isSubmitting.value = false;
  }
};
</script> 