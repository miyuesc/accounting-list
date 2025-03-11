import { defineEventHandler, readBody, createError } from 'h3';
import { Transaction } from '~/server/models/transaction';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';
import { z } from 'zod';

// 更新交易验证模式
const updateTransactionSchema = z.object({
  categoryId: z.string().min(1, '类别ID是必需的').optional(),
  amount: z.number().positive('金额必须为正数').optional(),
  description: z.string().optional(),
  transactionDate: z.string().or(z.date()).optional(),
  type: z.enum(['income', 'expense']).optional(),
  isBasicExpense: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取交易ID
    const id = event.context.params?.id;
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: '交易ID是必需的',
      });
    }
    
    // 获取并验证请求体
    const body = await readBody(event);
    const validationResult = updateTransactionSchema.safeParse(body);
    
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: '验证失败',
        data: validationResult.error.format(),
      });
    }
    
    const updates = validationResult.data;
    
    // 如果更新类别，验证新类别是否存在
    if (updates.categoryId) {
      const category = await Category.findById(updates.categoryId);
      
      if (!category) {
        throw createError({
          statusCode: 404,
          statusMessage: '类别不存在',
        });
      }
    }
    
    // 如果有日期，转换为Date对象
    if (updates.transactionDate) {
      updates.transactionDate = new Date(updates.transactionDate);
    }
    
    // 查找并更新交易
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!updatedTransaction) {
      throw createError({
        statusCode: 404,
        statusMessage: '交易不存在',
      });
    }
    
    return {
      success: true,
      data: updatedTransaction,
    };
  } catch (error: any) {
    console.error('更新交易错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '更新交易时发生错误',
    });
  }
}); 