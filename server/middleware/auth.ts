import { defineEventHandler, createError, readBody, getHeader } from 'h3';
import jwt from 'jsonwebtoken';
import { useRuntimeConfig } from '#imports';
import { User } from '~/server/models/user';
import { connectToDatabase } from '~/server/utils/db';

// 定义需要认证的路由路径前缀
const protectedRoutes = [
  '/api/transactions',
  '/api/categories',
  '/api/basic-expenses',
  '/api/reports',
];

// 检查路由是否需要认证
const isProtectedRoute = (path: string): boolean => {
  return protectedRoutes.some(route => path.startsWith(route));
};

export interface JwtPayload {
  userId: string;
  username: string;
}

export const verifyAuth = defineEventHandler(async (event) => {
  // 排除不需要验证的路由
  const { url } = event.node.req;
  if (url === '/api/auth/login' || url === '/api/auth/register') {
    return;
  }

  // 获取JWT令牌
  const authHeader = getHeader(event, 'Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Missing or invalid authentication token',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: No token provided',
    });
  }

  try {
    // 验证令牌
    const config = useRuntimeConfig();
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    // 将用户信息添加到事件上下文，以便路由处理程序可以访问
    event.context.auth = decoded;
  } catch (error) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid token',
    });
  }
});

// 认证中间件
export default defineEventHandler(async (event) => {
  const path = event.path || event.node.req.url || '';
  
  // 如果不是受保护的路由，直接放行
  if (!isProtectedRoute(path)) {
    return;
  }
  
  // 确保数据库连接
  await connectToDatabase();
  
  try {
    // 从请求头中获取用户ID
    const userId = getHeader(event, 'x-user-id');
    
    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权，请先登录',
      });
    }
    
    // 验证用户是否存在
    const user = await User.findById(userId);
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '无效的用户ID，请重新登录',
      });
    }
    
    // 将用户信息添加到事件上下文中，以便后续处理
    event.context.user = {
      id: user._id,
      username: user.username,
    };
    
  } catch (error: any) {
    // 处理错误
    if (error.statusCode) {
      throw error; // 如果是已经格式化的错误，直接抛出
    }
    
    console.error('认证错误:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '认证过程中发生错误',
    });
  }
});