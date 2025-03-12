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

// 检查是否是认证相关路由
const isAuthRoute = (path: string): boolean => {
  return path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register');
};

export interface JwtPayload {
  userId: string;
  username: string;
}

// 从token解析用户信息
const decodeToken = (token: string): JwtPayload => {
  const config = useRuntimeConfig();
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};

// 认证中间件
export default defineEventHandler(async (event) => {
  const path = event.path || event.node.req.url || '';
  
  // 如果是认证相关路由（登录/注册），直接放行
  if (isAuthRoute(path)) {
    return;
  }
  
  // 如果不是受保护的路由，直接放行
  if (!isProtectedRoute(path)) {
    return;
  }
  
  // 确保数据库连接
  await connectToDatabase();
  
  try {
    // 从请求头中获取Authorization
    const authHeader = getHeader(event, 'Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权，请先登录',
      });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权，请先登录',
      });
    }
    
    // 验证并解析token
    let decoded: JwtPayload;
    try {
      decoded = decodeToken(token);
    } catch (error) {
      throw createError({
        statusCode: 401,
        statusMessage: '无效的令牌，请重新登录',
      });
    }
    
    // 验证用户是否存在
    const user = await User.findById(decoded.userId);
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