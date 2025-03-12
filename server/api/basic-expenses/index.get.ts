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
    
    // 查询基本消费 - 使用 lean() 返回普通 JavaScript 对象
    const basicExpenses = await BasicExpense.find(filter)
      .populate({
        path: 'categoryId',
        select: 'name type id' // 只选择需要的字段
      })
      .sort({ amount: -1 })
      .lean();
    
    // 重新格式化数据，保留原始 categoryId
    const formattedExpenses = basicExpenses.map(expense => {
      // 检查 categoryId 是否为对象
      if (expense.categoryId && typeof expense.categoryId === 'object') {
        return {
          ...expense,
          // 保留原始 categoryId
          categoryId: expense.categoryId._id,
          // 添加类别名称为单独的字段
          categoryName: expense.categoryId.name,
          categoryType: expense.categoryId.type
        };
      }
      return expense;
    });
    
    return {
      success: true,
      data: formattedExpenses,
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