import { defineEventHandler, getQuery, createError } from 'h3';
import { BasicExpense } from '~/server/models/basicExpense';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 从认证中间件获取用户ID
    const userId = event.context.user?.id;
    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: '未授权，请先登录',
      });
    }
    
    // 获取查询参数
    const query = getQuery(event);
    
    const isActive = query.isActive === 'true';
    const categoryId = query.categoryId as string;
    const year = query.year ? parseInt(query.year as string) : null;
    const month = query.month ? parseInt(query.month as string) : null;
    
    // 构建查询条件
    const filter: any = { userId };
    
    // 处理状态筛选
    if (query.isActive !== undefined) {
      filter.isActive = isActive;
    }
    
    // 处理年月筛选
    if (year || month) {
      // 构建日期查询条件
      const dateFilter: any = {};
      
      if (year && month) {
        // 特定年月 - 查找在该月份内生效的基础消费
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
        
        // 基础消费的有效期必须与查询月份有重叠
        dateFilter.$or = [
          {
            // 开始日期在选中月份之前（或当月），结束日期在选中月份之后（或当月）
            startDate: { $lte: endOfMonth },
            endDate: { $gte: startOfMonth }
          }
        ];
      } else if (year) {
        // 只筛选年份 - 查找在该年份内任何时间生效的基础消费
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        
        dateFilter.$or = [
          {
            // 开始日期在选中年份之前（或当年），结束日期在选中年份之后（或当年）
            startDate: { $lte: endOfYear },
            endDate: { $gte: startOfYear }
          }
        ];
      }
      
      // 合并日期筛选条件到主查询
      Object.assign(filter, dateFilter);
    }
    
    // 处理类别筛选（包括子类别）
    if (categoryId) {
      // 首先获取该类别及其所有子类别
      const allCategoryIds = await getAllChildCategories(categoryId);
      filter.categoryId = { $in: allCategoryIds };
    }
    
    console.log('Query filter:', filter);
    
    // 查询基本消费
    const basicExpenses = await BasicExpense.find(filter)
      .populate('categoryId')
      .sort({ createdAt: -1 });
    
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

// 辅助函数：获取所有子类别 ID
async function getAllChildCategories(categoryId: string): Promise<string[]> {
  // 包含当前类别 ID
  const allIds = [categoryId];
  
  // 递归查找所有子类别
  async function findChildren(parentId: string) {
    const children = await Category.find({ parentId }).lean();
    
    for (const child of children) {
      allIds.push(child._id.toString());
      // 递归查找下一级子类别
      await findChildren(child._id.toString());
    }
  }
  
  // 开始递归查找
  await findChildren(categoryId);
  
  return allIds;
} 