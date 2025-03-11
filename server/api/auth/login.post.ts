import { defineEventHandler, readBody, createError } from 'h3';
import jwt from 'jsonwebtoken';
import { User } from '~/server/models/user';
import { connectToDatabase } from '~/server/utils/db';
import { useRuntimeConfig } from '#imports';
import { z } from 'zod';

// 用户登录验证模式
const loginSchema = z.object({
  username: z.string().min(1, '用户名是必需的'),
  password: z.string().min(1, '密码是必需的'),
});

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取并验证请求体
    const body = await readBody(event);
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: '验证失败',
        data: validationResult.error.format(),
      });
    }
    
    const { username, password } = validationResult.data;
    
    // 查找用户
    const user = await User.findOne({ username });
    
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: '用户名或密码不正确',
      });
    }
    
    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: '用户名或密码不正确',
      });
    }
    
    // 创建JWT令牌
    const config = useRuntimeConfig();
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
    
    // 返回令牌和用户信息
    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error: any) {
    // 处理错误
    if (error.statusCode) {
      throw error; // 如果是已经格式化的错误，直接抛出
    }
    
    console.error('登录错误:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '登录过程中发生错误',
    });
  }
});