import { defineEventHandler, getQuery, createError } from 'h3';
import { Transaction } from '~/server/models/transaction';
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
    
    // 改进参数解析，确保空字符串被视为未提供
    const categoryId = query.categoryId ? String(query.categoryId) : undefined;
    const type = query.type ? String(query.type) as 'income' | 'expense' : undefined;
    const startDate = query.startDate ? String(query.startDate) : undefined;
    const endDate = query.endDate ? String(query.endDate) : undefined;
    const page = parseInt(String(query.page || '1'));
    const limit = parseInt(String(query.limit || '20'));
    
    // 构建查询条件
    const filter: any = {
      // 始终使用认证用户的ID
      userId
    };
    
    if (type) {
      filter.type = type;
    }
    
    if (categoryId) {
      // 如果需要按类别层级筛选，先查找该类别的所有子类别
      const category = await Category.findById(categoryId);
      
      if (category) {
        if (query.includeSubcategories === 'true') {
          // 使用path字段查找所有子类别
          // 例如: 如果当前类别的path是"id1", 查找所有path包含"id1"的类别
          const allCategories = await Category.find({
            path: { $regex: categoryId }
          });
          
          const categoryIds = allCategories.map(cat => cat._id);
          filter.categoryId = { $in: categoryIds };
        } else {
          filter.categoryId = categoryId;
        }
      }
    }
    
    // 如果指定了时间段，创建日期范围过滤条件
    if (startDate || endDate) {
      filter.transactionDate = {};
      
      if (startDate) {
        filter.transactionDate.$gte = new Date(startDate);
      }
      
      if (endDate) {
        // 将结束日期设置为当天的23:59:59，以包含当天的所有交易
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.transactionDate.$lte = endDateTime;
      }
    }
    
    // 计算分页
    const skip = (page - 1) * limit;
    
    // 获取交易记录总数
    const total = await Transaction.countDocuments(filter);
    
    // 查询交易记录
    const transactions = await Transaction.find(filter)
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('categoryId');
    
    // 打印过滤条件，便于调试
    console.log('查询过滤条件:', JSON.stringify(filter));
    
    return {
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    };
  } catch (error: any) {
    console.error('获取交易记录错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '获取交易记录时发生错误',
    });
  }
}); 