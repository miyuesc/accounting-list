/**
 * API请求工具
 */

interface AuthHeaders {
  Authorization: string;
  'x-user-id': string | null;
}

// 获取认证头
export const getAuthHeader = (): Record<string, string> => {
  const token = process.client ? localStorage.getItem('token') : null;
  const userId = getUserId();
  
  if (token && userId) {
    return {
      Authorization: `Bearer ${token}`,
      'x-user-id': userId,
    };
  }
  
  return {};
};

// 获取用户ID
export const getUserId = (): string | null => {
  if (!process.client) return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    const user = JSON.parse(userStr);
    return user.id;
  } catch (e) {
    return null;
  }
};

// API请求包装器
export const api = {
  /**
   * GET请求
   */
  async get(url: string, params = {}) {
    try {
      return await $fetch(url, {
        method: 'GET',
        params,
        headers: getAuthHeader(),
      });
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  /**
   * POST请求
   */
  async post(url: string, data = {}) {
    try {
      return await $fetch(url, {
        method: 'POST',
        body: data,
        headers: getAuthHeader(),
      });
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  /**
   * PUT请求
   */
  async put(url: string, data = {}) {
    try {
      return await $fetch(url, {
        method: 'PUT',
        body: data,
        headers: getAuthHeader(),
      });
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  /**
   * DELETE请求
   */
  async delete(url: string) {
    try {
      return await $fetch(url, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
};

// 处理API错误
const handleApiError = (error: any) => {
  // 处理未授权错误
  if (error.response?.status === 401) {
    // 清除登录状态
    if (process.client) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
    // 获取当前认证状态，并重置
    const isAuthenticated = useState('isAuthenticated');
    const user = useState('user');
    
    if (isAuthenticated.value) {
      isAuthenticated.value = false;
      user.value = {};
      
      // 如果在客户端，跳转到登录页
      if (process.client) {
        navigateTo('/login');
      }
    }
  }
}; 