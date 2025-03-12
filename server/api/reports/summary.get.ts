import { defineEventHandler, getQuery, createError } from 'h3';
import { Transaction } from '~/server/models/transaction';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

// 扩展dayjs使用周和季度
dayjs.extend(weekOfYear);
dayjs.extend(quarterOfYear);

// 定义报表结果类型
interface CategoryData {
  name: string;
  amount: number;
  count: number;
}

interface TypeData {
  total: number;
  byCategory: Record<string, CategoryData>;
}

interface PeriodData {
  income: TypeData;
  expense: TypeData;
}

type FormattedResults = Record<string, PeriodData>;

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
    
    const period = query.period as 'week' | 'month' | 'quarter' | 'year';
    const year = parseInt(query.year as string || dayjs().year().toString());
    const categoryLevel = parseInt(query.categoryLevel as string || '1');
    
    if (!period || !['week', 'month', 'quarter', 'year'].includes(period)) {
      throw createError({
        statusCode: 400,
        statusMessage: '有效的时间段是必需的（week/month/quarter/year）',
      });
    }
    
    // 根据时间段确定开始和结束日期
    const startDate = dayjs().year(year).startOf('year').toDate();
    const endDate = dayjs().year(year).endOf('year').toDate();
    
    // 构建管道
    const aggregationPipeline: any[] = [
      {
        $match: {
          userId,
          transactionDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $unwind: '$category',
      },
      {
        $match: {
          'category.level': categoryLevel,
        },
      },
    ];
    
    // 根据时间段添加不同的分组
    let groupBy: any = {};
    
    switch (period) {
      case 'week':
        groupBy = {
          $week: '$transactionDate',
        };
        break;
      case 'month':
        groupBy = {
          $month: '$transactionDate',
        };
        break;
      case 'quarter':
        groupBy = {
          $ceil: { $divide: [{ $month: '$transactionDate' }, 3] },
        };
        break;
      case 'year':
        groupBy = {
          $year: '$transactionDate',
        };
        break;
    }
    
    // 完成管道
    aggregationPipeline.push(
      {
        $group: {
          _id: {
            timePeriod: groupBy,
            type: '$type',
            categoryId: '$category._id',
            categoryName: '$category.name',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.timePeriod': 1,
          '_id.categoryName': 1,
        },
      }
    );
    
    // 执行聚合查询
    const results = await Transaction.aggregate(aggregationPipeline);
    
    // 处理结果
    const formattedResults: FormattedResults = {};
    
    results.forEach((item) => {
      const periodLabel = `${period}_${item._id.timePeriod}`;
      
      if (!formattedResults[periodLabel]) {
        formattedResults[periodLabel] = {
          income: {
            total: 0,
            byCategory: {},
          },
          expense: {
            total: 0,
            byCategory: {},
          },
        };
      }
      
      const typeData = formattedResults[periodLabel][item._id.type as 'income' | 'expense'];
      
      // 添加类别数据
      typeData.byCategory[item._id.categoryId.toString()] = {
        name: item._id.categoryName,
        amount: item.total,
        count: item.count,
      };
      
      // 更新总计
      typeData.total += item.total;
    });
    
    return {
      success: true,
      data: {
        period,
        year,
        categoryLevel,
        results: formattedResults,
      },
    };
  } catch (error: any) {
    console.error('生成报表错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '生成报表时发生错误',
    });
  }
}); 