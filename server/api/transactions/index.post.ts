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
  isBasicExpense: z.boolean().optional().default(false),
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
      description,
      transactionDate,
      type,
      isBasicExpense,
    } = validationResult.data;
    
    // 验证类别是否存在
    const category = await Category.findById(categoryId);
    
    if (!category) {
      throw createError({
        statusCode: 404,
        statusMessage: '类别不存在',
      });
    }
    
    // 创建新交易
    const newTransaction = new Transaction({
      userId,
      categoryId,
      amount,
      description,
      transactionDate: new Date(transactionDate),
      type,
      isBasicExpense,
    });
    
    await newTransaction.save();
    
    return {
      success: true,
      data: newTransaction,
    };
  } catch (error: any) {
    console.error('创建交易错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '创建交易时发生错误',
    });
  }
}); 