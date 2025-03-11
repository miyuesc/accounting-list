import { defineEventHandler, readBody, createError } from 'h3';
import { User } from '~/server/models/user';
import { connectToDatabase } from '~/server/utils/db';
import { z } from 'zod';

// 用户注册验证模式
const registerSchema = z.object({
  username: z.string().min(3, '用户名至少需要3个字符').max(50),
  password: z.string().min(6, '密码至少需要6个字符'),
  email: z.string().email('请提供有效的电子邮件地址'),
  name: z.string().min(2, '姓名至少需要2个字符'),
});

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取并验证请求体
    const body = await readBody(event);
    const validationResult = registerSchema.safeParse(body);
    
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: '验证失败',
        data: validationResult.error.format(),
      });
    }
    
    const { username, password, email, name } = validationResult.data;
    
    // 检查用户名和电子邮件是否已存在
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    
    if (existingUser) {
      throw createError({
        statusCode: 409,
        statusMessage: '用户名或电子邮件已存在',
      });
    }
    
    // 创建新用户
    const newUser = new User({
      username,
      password, // 密码将在保存前自动哈希
      email,
      name,
    });
    
    await newUser.save();
    
    // 返回成功响应（不包含密码）
    return {
      success: true,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
      },
    };
  } catch (error: any) {
    // 处理错误
    if (error.statusCode) {
      throw error; // 如果是已经格式化的错误，直接抛出
    }
    
    console.error('用户注册错误:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '注册过程中发生错误',
    });
  }
});