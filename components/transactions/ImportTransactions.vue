<template>
  <UModal v-model="modelValue" :ui="{ width: 'sm:max-w-xl' }">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">导入Excel交易记录</h3>
          <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark" @click="closeModal" />
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
            @click="handleImport"
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
            @click="closeModal"
          >
            关闭
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { api } from '~/utils/api';

const modelValue = defineModel<boolean>('modelValue');

const emit = defineEmits<{
  (e: 'success'): void;
}>();

// Toast消息
const toast = useToast();

// 状态变量
const isImporting = ref(false);
const importResults = ref<{
  succeeded: number;
  failed: number;
  errors?: Array<{
    row: number;
    message: string;
    data: any;
  }>;
} | null>(null);
const importFile = ref<File | null>(null);

// 处理文件变化
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    importFile.value = file;
  }
};

// 处理导入
const handleImport = async () => {
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
      data: {
        succeeded: number;
        failed: number;
        errors?: Array<{
          row: number;
          message: string;
          data: any;
        }>;
      };
    }>('/api/transactions/import', formData);
    
    if (response.success) {
      importResults.value = response.data;
      
      toast.add({
        title: '导入完成',
        description: `成功: ${response.data.succeeded}, 失败: ${response.data.failed}`,
        color: response.data.failed > 0 ? 'amber' : 'green'
      });
      
      emit('success');
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

// 关闭弹窗
const closeModal = () => {
  modelValue.value = false;
  resetImport();
};
</script> 