import { defineEventHandler, getQuery, createError } from 'h3';
import { BasicExpense } from '~/server/models/basicExpense';
import { connectToDatabase } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取查询参数
    const query = getQuery(event);
    
    const userId = query.userId as string;
    const isActive = query.isActive === 'true';
    
    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: '用户ID是必需的',
      });
    }
    
    // 构建查询条件
    const filter: any = { userId };
    
    if (query.isActive !== undefined) {
      filter.isActive = isActive;
    }
    
    // 查询基本消费
    const basicExpenses = await BasicExpense.find(filter)
      .populate('categoryId')
      .sort({ amount: -1 });
    
    return {
      success: true,
      data: basicExpenses,
    };
  } catch (error: any) {
    console.error('获取基本消费错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '获取基本消费时发生错误',
    });
  }
}); 