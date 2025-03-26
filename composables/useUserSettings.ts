import { watchEffect } from 'vue';
import { api } from '~/utils/api';

interface UserSettings {
  currency: string;
  language: string;
  id: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  settings: UserSettings;
}

export const useUserSettings = () => {
  const settings = useState<UserSettings>('userSettings', () => ({
    currency: 'CNY',
    language: 'zh-CN',
    id: '',
  }));

  // 加载用户设置
  const loadSettings = async () => {
    try {
      const response = await api.get<ApiResponse<UserData>>('/api/users/me');
      
      if (response.success) {
        settings.value = {
          ...settings.value,
          ...response.data.settings,
          id: response.data.id,
        };
      }
    } catch (error) {
      console.error('加载用户设置失败:', error);
    }
  };

  // 更新用户设置
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const response = await api.put<ApiResponse<UserData>>('/api/users/me', {
        settings: newSettings,
      });
      
      if (response.success) {
        settings.value = {
          ...settings.value,
          ...newSettings,
        };
      }
    } catch (error) {
      console.error('更新用户设置失败:', error);
    }
  };

  return {
    settings,
    loadSettings,
    updateSettings,
  };
}; 