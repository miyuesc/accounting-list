import { Transaction } from '~/server/models/transaction';
import { BasicExpense } from '~/server/models/basicExpense';
import { Category } from '~/server/models/category';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { userId, year, month } = query;
    
    // ... 现有的交易统计逻辑 ...
    
    // 添加基础消费统计
    const basicExpenses = await BasicExpense.find({
      userId,
      isActive: true
    });
    
    // 计算基础消费总额
    const totalBasicExpense = basicExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    // 为每个基础消费添加类别信息
    const basicExpensesWithCategory = await Promise.all(
      basicExpenses.map(async (expense) => {
        const category = await Category.findById(expense.categoryId);
        return {
          ...expense._doc,
          categoryName: category ? category.name : '未知类别'
        };
      })
    );
    
    // 将基础消费添加到响应中
    return {
      success: true,
      data: {
        // ... 现有的交易统计数据 ...
        basicExpenses: {
          total: totalBasicExpense,
          items: basicExpensesWithCategory
        }
      }
    };
  } catch (error) {
    console.error('获取月度统计错误:', error);
    return {
      success: false,
      message: (error as Error)?.message || '获取月度统计失败'
    };
  }
}); 