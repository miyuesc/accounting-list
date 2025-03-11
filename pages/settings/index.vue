<template>
  <div>
    <h2 class="text-xl font-semibold mb-6">个人设置</h2>
    
    <div class="space-y-6">
      <!-- 个人资料卡片 -->
      <UCard>
        <template #header>
          <div class="flex items-center">
            <div class="i-heroicons-user-circle text-2xl text-primary-500 mr-2"></div>
            <h3 class="text-base font-medium">个人资料</h3>
          </div>
        </template>
        
        <UForm :state="profileForm" class="space-y-4" @submit="saveProfile">
          <UFormGroup label="用户名" name="username">
            <UInput v-model="profileForm.username" placeholder="请输入用户名" />
          </UFormGroup>
          
          <UFormGroup label="电子邮箱" name="email">
            <UInput 
              v-model="profileForm.email" 
              type="email"
              placeholder="请输入电子邮箱"
              :disabled="true"
            />
            <template #hint>
              <span class="text-xs text-gray-500">邮箱地址不可修改</span>
            </template>
          </UFormGroup>
          
          <div class="pt-2">
            <UButton type="submit" color="primary" :loading="isSavingProfile">
              保存个人资料
            </UButton>
          </div>
        </UForm>
      </UCard>
      
      <!-- 密码修改卡片 -->
      <UCard>
        <template #header>
          <div class="flex items-center">
            <div class="i-heroicons-key text-2xl text-primary-500 mr-2"></div>
            <h3 class="text-base font-medium">修改密码</h3>
          </div>
        </template>
        
        <UForm :state="passwordForm" class="space-y-4" @submit="changePassword">
          <UFormGroup label="当前密码" name="currentPassword">
            <UInput 
              v-model="passwordForm.currentPassword" 
              type="password"
              placeholder="请输入当前密码" 
            />
          </UFormGroup>
          
          <UFormGroup label="新密码" name="newPassword">
            <UInput 
              v-model="passwordForm.newPassword" 
              type="password"
              placeholder="请输入新密码" 
            />
            <template #hint>
              <span class="text-xs text-gray-500">密码长度至少为6位</span>
            </template>
          </UFormGroup>
          
          <UFormGroup label="确认新密码" name="confirmPassword">
            <UInput 
              v-model="passwordForm.confirmPassword" 
              type="password"
              placeholder="请再次输入新密码" 
            />
          </UFormGroup>
          
          <div class="pt-2">
            <UButton type="submit" color="primary" :loading="isChangingPassword">
              修改密码
            </UButton>
          </div>
        </UForm>
      </UCard>
      
      <!-- 系统设置卡片 -->
      <UCard>
        <template #header>
          <div class="flex items-center">
            <div class="i-heroicons-cog-6-tooth text-2xl text-primary-500 mr-2"></div>
            <h3 class="text-base font-medium">系统设置</h3>
          </div>
        </template>
        
        <div class="space-y-4">
          <!-- 主题设置 -->
          <div class="flex items-center justify-between py-2">
            <div>
              <div class="font-medium">深色模式</div>
              <div class="text-sm text-gray-500">切换界面明暗主题</div>
            </div>
            <UToggle v-model="systemSettings.darkMode" @change="saveSystemSettings" />
          </div>
          
          <!-- 默认货币 -->
          <div class="flex items-center justify-between py-2">
            <div>
              <div class="font-medium">默认货币</div>
              <div class="text-sm text-gray-500">设置账单金额的显示货币</div>
            </div>
            <USelect 
              v-model="systemSettings.currency" 
              :options="currencyOptions" 
              :ui="{ wrapper: 'w-32' }"
              @change="saveSystemSettings"
            />
          </div>
          
          <!-- 语言设置 -->
          <div class="flex items-center justify-between py-2">
            <div>
              <div class="font-medium">语言</div>
              <div class="text-sm text-gray-500">设置系统界面语言</div>
            </div>
            <USelect 
              v-model="systemSettings.language" 
              :options="languageOptions" 
              :ui="{ wrapper: 'w-32' }"
              @change="saveSystemSettings"
            />
          </div>
        </div>
      </UCard>
      
      <!-- 数据导出卡片 -->
      <UCard>
        <template #header>
          <div class="flex items-center">
            <div class="i-heroicons-arrow-down-tray text-2xl text-primary-500 mr-2"></div>
            <h3 class="text-base font-medium">数据导出</h3>
          </div>
        </template>
        
        <div class="space-y-4">
          <p class="text-sm text-gray-600">
            导出您的记账数据，支持多种格式。导出的文件包含您所有的交易记录、类别和基础消费设置。
          </p>
          
          <div class="flex flex-wrap gap-2">
            <UButton
              color="gray"
              :icon="isExporting === 'json' ? 'i-heroicons-arrow-path' : 'i-heroicons-document'"
              :loading="isExporting === 'json'"
              @click="exportData('json')"
            >
              导出为 JSON
            </UButton>
            
            <UButton
              color="gray"
              :icon="isExporting === 'csv' ? 'i-heroicons-arrow-path' : 'i-heroicons-document-text'"
              :loading="isExporting === 'csv'"
              @click="exportData('csv')"
            >
              导出为 CSV
            </UButton>
            
            <UButton
              color="gray"
              :icon="isExporting === 'excel' ? 'i-heroicons-arrow-path' : 'i-heroicons-table-cells'"
              :loading="isExporting === 'excel'"
              @click="exportData('excel')"
            >
              导出为 Excel
            </UButton>
          </div>
        </div>
      </UCard>
      
      <!-- 账户删除卡片 -->
      <UCard>
        <template #header>
          <div class="flex items-center">
            <div class="i-heroicons-exclamation-triangle text-2xl text-red-500 mr-2"></div>
            <h3 class="text-base font-medium text-red-500">危险区域</h3>
          </div>
        </template>
        
        <div class="space-y-4">
          <p class="text-sm text-gray-600">
            删除账户将永久移除与您账户相关的所有数据，此操作无法撤销。
          </p>
          
          <UButton
            color="red"
            variant="soft"
            icon="i-heroicons-trash"
            @click="showDeleteAccountModal = true"
          >
            删除我的账户
          </UButton>
        </div>
      </UCard>
    </div>
    
    <!-- 删除账户确认弹窗 -->
    <UModal v-model="showDeleteAccountModal">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100' }">
        <template #header>
          <div class="text-red-500 font-medium">确认删除账户</div>
        </template>
        
        <div class="py-4 space-y-4">
          <p class="text-sm">此操作将<strong class="text-red-500">永久删除</strong>您的账户和所有数据，无法恢复。</p>
          
          <UFormGroup label="请输入您的密码以确认" name="confirmDeletePassword">
            <UInput 
              v-model="deleteAccountPassword" 
              type="password"
              placeholder="请输入密码" 
            />
          </UFormGroup>
          
          <UAlert color="red" icon="i-heroicons-exclamation-triangle">
            请确认您已理解此操作的后果。
          </UAlert>
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="soft" @click="showDeleteAccountModal = false">
              取消
            </UButton>
            <UButton
              color="red"
              :loading="isDeletingAccount"
              :disabled="!deleteAccountPassword"
              @click="deleteAccount"
            >
              永久删除我的账户
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
import { api, getUserId } from '~/utils/api';
import { useToast } from '#imports';

const toast = useToast();
const router = useRouter();

// 状态变量
const profileForm = ref({
  username: '',
  email: '',
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const systemSettings = ref({
  darkMode: false,
  currency: 'CNY',
  language: 'zh-CN',
});

const isSavingProfile = ref(false);
const isChangingPassword = ref(false);
const isExporting = ref(null);
const showDeleteAccountModal = ref(false);
const deleteAccountPassword = ref('');
const isDeletingAccount = ref(false);

// 选项数据
const currencyOptions = [
  { label: '人民币 (¥)', value: 'CNY' },
  { label: '美元 ($)', value: 'USD' },
  { label: '欧元 (€)', value: 'EUR' },
  { label: '英镑 (£)', value: 'GBP' },
  { label: '日元 (¥)', value: 'JPY' },
];

const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: '繁體中文', value: 'zh-TW' },
  { label: 'English', value: 'en-US' },
];

// 加载用户数据
const loadUserData = async () => {
  try {
    const response = await api.get(`/api/users/${getUserId()}`);
    
    if (response.success && response.data) {
      const { username, email, settings } = response.data;
      
      profileForm.value = {
        username,
        email,
      };
      
      if (settings) {
        systemSettings.value = {
          ...systemSettings.value,
          ...settings,
        };
      }
    }
  } catch (error) {
    console.error('加载用户数据错误:', error);
    toast.add({
      title: '加载用户数据失败',
      color: 'red',
    });
  }
};

// 保存个人资料
const saveProfile = async () => {
  try {
    isSavingProfile.value = true;
    
    const response = await api.put(`/api/users/${getUserId()}`, {
      username: profileForm.value.username,
    });
    
    if (response.success) {
      toast.add({
        title: '个人资料已更新',
        color: 'green',
      });
    }
  } catch (error) {
    console.error('保存个人资料错误:', error);
    toast.add({
      title: '保存个人资料失败',
      color: 'red',
    });
  } finally {
    isSavingProfile.value = false;
  }
};

// 修改密码
const changePassword = async () => {
  try {
    // 简单前端验证
    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
      toast.add({
        title: '两次输入的新密码不一致',
        color: 'red',
      });
      return;
    }
    
    if (passwordForm.value.newPassword.length < 6) {
      toast.add({
        title: '新密码长度至少为6位',
        color: 'red',
      });
      return;
    }
    
    isChangingPassword.value = true;
    
    const response = await api.put(`/api/users/${getUserId()}/password`, {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    });
    
    if (response.success) {
      toast.add({
        title: '密码已成功修改',
        color: 'green',
      });
      
      // 清空表单
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      };
    }
  } catch (error) {
    console.error('修改密码错误:', error);
    toast.add({
      title: error.message || '修改密码失败',
      color: 'red',
    });
  } finally {
    isChangingPassword.value = false;
  }
};

// 保存系统设置
const saveSystemSettings = async () => {
  try {
    const response = await api.put(`/api/users/${getUserId()}/settings`, {
      settings: systemSettings.value,
    });
    
    if (response.success) {
      toast.add({
        title: '系统设置已更新',
        color: 'green',
      });
    }
  } catch (error) {
    console.error('保存系统设置错误:', error);
    toast.add({
      title: '保存系统设置失败',
      color: 'red',
    });
  }
};

// 导出数据
const exportData = async (format) => {
  try {
    isExporting.value = format;
    
    const response = await api.get(`/api/users/${getUserId()}/export`, {
      format,
    });
    
    if (response.success && response.data?.url) {
      // 使用浏览器下载文件
      const a = document.createElement('a');
      a.href = response.data.url;
      a.download = `accounting-data-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      
      toast.add({
        title: '数据导出成功',
        color: 'green',
      });
    }
  } catch (error) {
    console.error('导出数据错误:', error);
    toast.add({
      title: '导出数据失败',
      color: 'red',
    });
  } finally {
    isExporting.value = null;
  }
};

// 删除账户
const deleteAccount = async () => {
  try {
    isDeletingAccount.value = true;
    
    const response = await api.delete(`/api/users/${getUserId()}`, {
      password: deleteAccountPassword.value,
    });
    
    if (response.success) {
      // 清除本地存储的用户信息和令牌
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      
      toast.add({
        title: '账户已删除',
        description: '您的账户和所有数据已被永久删除',
        color: 'green',
      });
      
      // 跳转到登录页
      router.push('/login');
    }
  } catch (error) {
    console.error('删除账户错误:', error);
    toast.add({
      title: error.message || '删除账户失败',
      color: 'red',
    });
  } finally {
    isDeletingAccount.value = false;
    showDeleteAccountModal.value = false;
    deleteAccountPassword.value = '';
  }
};

// 初始加载
onMounted(() => {
  loadUserData();
});
</script> 