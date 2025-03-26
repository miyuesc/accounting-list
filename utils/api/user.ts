
// @ts-ignore - xlsx模块缺少类型声明
import { read, utils } from 'xlsx';

const { add: showToast } = useToast();

// 获取当前用户信息
export const getCurrentUser = async () => {
  try {
    const response = await fetch('/api/users/me');
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    }
    throw new Error(data.message || '获取用户信息失败');
  } catch (error: any) {
    showToast({
      title: '获取用户信息失败',
      description: error.message || '请稍后再试',
    });
    throw error;
  }
};

// 更新用户信息
export const updateUser = async (data: { username?: string; settings?: any }) => {
  try {
    const response = await fetch('/api/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (result.success) {
      showToast({
        title: '用户信息已更新',
      });
      return result.data;
    }
    throw new Error(result.message || '更新用户信息失败');
  } catch (error: any) {
    showToast({
      title: '更新用户信息失败',
      description: error.message || '请稍后再试',
    });
    throw error;
  }
};

// 修改密码
export const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
  try {
    const response = await fetch('/api/users/me/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (result.success) {
      showToast({
        title: '密码已更新',
      });
      return result.data;
    }
    throw new Error(result.message || '更新密码失败');
  } catch (error: any) {
    showToast({
      title: '更新密码失败',
      description: error.message || '请稍后再试',
    });
    throw error;
  }
};

// 删除账户
export const deleteAccount = async (password: string) => {
  try {
    const response = await fetch('/api/users/me', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    const result = await response.json();
    
    if (result.success) {
      showToast({
        title: '账户已删除',
      });
      return result.data;
    }
    throw new Error(result.message || '删除账户失败');
  } catch (error: any) {
    showToast({
      title: '删除账户失败',
      description: error.message || '请稍后再试',
    });
    throw error;
  }
};

// 导出数据
export const exportData = async (format: 'json' | 'csv' | 'excel') => {
  try {
    const response = await fetch(`/api/users/me/export?format=${format}`);
    const data = await response.json();
    
    if (data.success) {
      showToast({
        title: '数据导出成功',
      });
      return data.data;
    }
    throw new Error(data.message || '导出数据失败');
  } catch (error: any) {
    showToast({
      title: '导出数据失败',
      description: error.message || '请稍后再试',
    });
    throw error;
  }
};

