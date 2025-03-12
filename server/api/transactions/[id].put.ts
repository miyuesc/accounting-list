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
    
    // 从认证中间件获取用户ID
    const userId = event.context.user?.id;
    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权，请先登录',
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
    
    const updateData = validationResult.data;
    
    // 查找交易记录
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      throw createError({
        statusCode: 404,
        statusMessage: '交易记录不存在',
      });
    }
    
    // 验证是否是当前用户的交易
    if (transaction.userId.toString() !== userId.toString()) {
      throw createError({
        statusCode: 403,
        statusMessage: '无权修改其他用户的交易记录',
      });
    }
    
    // 如果更新类别，验证类别是否存在
    if (updateData.categoryId) {
      const category = await Category.findById(updateData.categoryId);
      
      if (!category) {
        throw createError({
          statusCode: 404,
          statusMessage: '类别不存在',
        });
      }
      
      // 验证类别所有权
      if (category.userId.toString() !== userId.toString()) {
        throw createError({
          statusCode: 403,
          statusMessage: '无权使用其他用户的类别',
        });
      }
      
      // 验证类型是否与类别匹配
      const type = updateData.type || transaction.type;
      if (category.type !== type) {
        throw createError({
          statusCode: 400,
          statusMessage: `类别 ${category.name} 是 ${category.type} 类型，不能用于 ${type} 交易`,
        });
      }
    }
    
    // 如果有日期，转换为Date对象
    if (updateData.transactionDate) {
      updateData.transactionDate = new Date(updateData.transactionDate);
    }
    
    // 更新交易记录
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    return {
      success: true,
      data: updatedTransaction,
    };
  } catch (error: any) {
    console.error('更新交易记录错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '更新交易记录时发生错误',
    });
  }
}); 