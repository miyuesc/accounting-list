import { defineEventHandler, readBody, createError } from 'h3';
import { BasicExpense } from '~/server/models/basicExpense';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';
import { z } from 'zod';

// 基本消费验证模式
const basicExpenseSchema = z.object({
  userId: z.string().min(1, '用户ID是必需的'),
  categoryId: z.string().min(1, '类别ID是必需的'),
  amount: z.number().positive('金额必须为正数'),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取并验证请求体
    const body = await readBody(event);
    const validationResult = basicExpenseSchema.safeParse(body);
    
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: '验证失败',
        data: validationResult.error.format(),
      });
    }
    
    const {
      userId,
      categoryId,
      amount,
      description,
      isActive,
    } = validationResult.data;
    
    // 验证类别是否存在
    const category = await Category.findById(categoryId);
    
    if (!category) {
      throw createError({
        statusCode: 404,
        statusMessage: '类别不存在',
      });
    }
    
    // 创建新的基本消费配置
    const newBasicExpense = new BasicExpense({
      userId,
      categoryId,
      amount,
      description,
      isActive,
    });
    
    await newBasicExpense.save();
    
    return {
      success: true,
      data: newBasicExpense,
    };
  } catch (error: any) {
    console.error('创建基本消费错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '创建基本消费时发生错误',
    });
  }
}); 