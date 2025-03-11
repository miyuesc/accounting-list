import { defineEventHandler, getQuery, createError } from 'h3';
import { Transaction } from '~/server/models/transaction';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';
import dayjs from 'dayjs';

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取查询参数
    const query = getQuery(event);
    
    const userId = query.userId as string;
    const categoryId = query.categoryId as string;
    const type = query.type as 'income' | 'expense';
    const startDate = query.startDate as string;
    const endDate = query.endDate as string;
    const isBasicExpense = query.isBasicExpense === 'true';
    const period = query.period as 'week' | 'month' | 'quarter' | 'year';
    const page = parseInt(query.page as string || '1');
    const limit = parseInt(query.limit as string || '20');
    
    // 构建查询条件
    const filter: any = {};
    
    if (userId) {
      filter.userId = userId;
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
    
    if (type) {
      filter.type = type;
    }
    
    // 如果指定了时间段
    if (startDate || endDate) {
      filter.transactionDate = {};
      
      if (startDate) {
        filter.transactionDate.$gte = new Date(startDate);
      }
      
      if (endDate) {
        filter.transactionDate.$lte = new Date(endDate);
      }
    } else if (period) {
      // 如果指定了预定义的时间段
      const now = dayjs();
      let start;
      
      switch (period) {
        case 'week':
          start = now.startOf('week');
          break;
        case 'month':
          start = now.startOf('month');
          break;
        case 'quarter':
          start = now.startOf('quarter');
          break;
        case 'year':
          start = now.startOf('year');
          break;
      }
      
      if (start) {
        filter.transactionDate = {
          $gte: start.toDate(),
          $lte: now.toDate(),
        };
      }
    }
    
    if (query.isBasicExpense !== undefined) {
      filter.isBasicExpense = isBasicExpense;
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
    
    return {
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
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