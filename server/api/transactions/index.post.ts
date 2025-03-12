import { defineEventHandler, readBody, createError } from 'h3';
import { Transaction } from '~/server/models/transaction';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';
import { z } from 'zod';

// 交易验证模式
const transactionSchema = z.object({
  userId: z.string().min(1, '用户ID是必需的'),
  categoryId: z.string().min(1, '类别ID是必需的'),
  amount: z.number().positive('金额必须为正数'),
  description: z.string().optional(),
  transactionDate: z.string().or(z.date()),
  type: z.enum(['income', 'expense']),
});

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取并验证请求体
    const body = await readBody(event);
    const validationResult = transactionSchema.safeParse(body);
    
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
      description = '',
      transactionDate,
      type,
    } = validationResult.data;
    
    // 验证类别是否存在且与用户匹配
    const category = await Category.findById(categoryId);
    
    if (!category) {
      throw createError({
        statusCode: 404,
        statusMessage: '类别不存在',
      });
    }
    
    // 验证类型是否与类别匹配
    if (category.type !== type) {
      throw createError({
        statusCode: 400,
        statusMessage: `类别 ${category.name} 是 ${category.type} 类型，不能用于 ${type} 交易`,
      });
    }
    
    // 创建新交易
    const transaction = new Transaction({
      userId,
      categoryId,
      amount,
      description,
      transactionDate: new Date(transactionDate),
      type,
    });
    
    // 保存到数据库
    await transaction.save();
    
    return {
      success: true,
      data: transaction,
    };
  } catch (error: any) {
    console.error('创建交易记录错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '创建交易记录时发生错误',
    });
  }
}); 