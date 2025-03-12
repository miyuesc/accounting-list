import { defineEventHandler, getQuery, createError } from 'h3';
import { Transaction } from '~/server/models/transaction';
import { Category } from '~/server/models/category';
import { BasicExpense } from '~/server/models/basicExpense';
import { connectToDatabase } from '~/server/utils/db';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

// 启用季度插件
dayjs.extend(quarterOfYear);

// 定义类型接口，增强代码可读性和类型安全
interface CategoryData {
  amount: number;
  count: number;
  name: string;
  type: string;
  isBasicExpense: boolean;
  [key: string]: any;
}

interface CategoryWithChildren extends Record<string, any> {
  _id: any;
  name: string;
  children: CategoryWithChildren[];
  type: string;
  isBasicExpense: boolean;
  [key: string]: any;
}

export default defineEventHandler(async (event) => {
  try {
    await connectToDatabase();
    const query = getQuery(event);
    
    // 解析查询参数
    const userId = query.userId as string;
    const period = query.period as 'year' | 'quarter' | 'month';
    const year = parseInt(query.year as string, 10);
    const month = query.month ? parseInt(query.month as string, 10) : undefined;
    const quarter = query.quarter ? parseInt(query.quarter as string, 10) : undefined;
    const includeBasicExpense = query.includeBasicExpense !== 'false';
    
    if (!userId || !period || isNaN(year)) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少必要的查询参数',
      });
    }
    
    // 根据周期类型构建日期范围
    let startDate: Date, endDate: Date;
    
    switch (period) {
      case 'year':
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        break;
        
      case 'quarter':
        if (!quarter || quarter < 1 || quarter > 4) {
          throw createError({
            statusCode: 400,
            statusMessage: '季度值无效',
          });
        }
        startDate = dayjs(`${year}-01-01`).quarter(quarter).startOf('quarter').toDate();
        endDate = dayjs(`${year}-01-01`).quarter(quarter).endOf('quarter').toDate();
        break;
        
      case 'month':
        if (!month || month < 1 || month > 12) {
          throw createError({
            statusCode: 400,
            statusMessage: '月份值无效',
          });
        }
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
        break;
        
      default:
        throw createError({
          statusCode: 400,
          statusMessage: '不支持的周期类型',
        });
    }
    
    // 查询条件
    const dateFilter = {
      transactionDate: {
        $gte: startDate,
        $lte: endDate,
      },
      userId,
    };
    
    // 获取交易数据
    const transactions = await Transaction.find(dateFilter).lean();
    
    // 获取基础消费数据（如果需要）
    let basicExpenses = [];
    if (includeBasicExpense) {
      // 查询与时间范围重叠的所有有效基础消费
      basicExpenses = await BasicExpense.find({
        userId,
        isActive: true,
        // 确保基础消费的生效期与查询时间重叠
        startDate: { $lte: endDate },  // 开始日期早于或等于查询结束日期
        endDate: { $gte: startDate },  // 结束日期晚于或等于查询开始日期
      }).lean();
    }
    
    // 按类型分离交易
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    // 从数据库获取类别树
    const categories = await Category.find().lean();

    // 构建类别树映射
    const categoryMap = new Map<string, CategoryWithChildren>();
    categories.forEach(cat => {
      categoryMap.set(cat._id.toString(), {
        ...cat,
        children: [],
        type: cat.type,
        isBasicExpense: !!cat.isBasicExpense
      });
    });

    // 构建父子关系
    categories.forEach(cat => {
      if (cat.parentId) {
        const parentId = typeof cat.parentId === 'object' ? cat.parentId.toString() : cat.parentId;
        const parent = categoryMap.get(parentId);
        const child = categoryMap.get(cat._id.toString())
        if (parent && child) {
          parent.children.push(child);
        }
      }
    });

    // 在处理交易数据时，实现父类别汇总子类别数据的逻辑
    const processCategoryData = (transactions: any[]) => {
      // 按类别 ID 分组交易
      const categoryData: Record<string, CategoryData> = {};
      
      // 先处理所有交易
      transactions.forEach(transaction => {
        // 确保 categoryId 是字符串
        const catId = typeof transaction.categoryId === 'object' 
          ? transaction.categoryId._id?.toString() || transaction.categoryId.toString() 
          : transaction.categoryId?.toString();
        
        if (!catId) {
          console.warn('交易记录缺少类别ID:', transaction);
          return; // 跳过没有类别ID的交易
        }
        
        if (!categoryData[catId]) {
          const category = categoryMap.get(catId);
          categoryData[catId] = {
            amount: 0,
            count: 0,
            name: category ? category.name : '未知类别',
            type: category ? category.type : transaction.type,
            isBasicExpense: category ? !!category.isBasicExpense : false
          };
        }
        
        // 确保金额是数字
        const amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(transaction.amount) || 0;
        categoryData[catId].amount += amount;
        categoryData[catId].count += 1;
      });
      
      // 递归函数，从树的底部向上汇总数据
      const sumChildrenData = (categoryId: string): { amount: number; count: number } => {
        const category = categoryMap.get(categoryId);
        if (!category) return { amount: 0, count: 0 };
        
        let totalAmount = categoryData[categoryId]?.amount || 0;
        let totalCount = categoryData[categoryId]?.count || 0;
        
        // 递归汇总所有子类别
        for (const child of category.children || []) {
          const childId = child._id.toString();
          const childData = sumChildrenData(childId);
          totalAmount += childData.amount;
          totalCount += childData.count;
        }
        
        // 更新或创建当前类别的数据
        if (!categoryData[categoryId]) {
          categoryData[categoryId] = {
            amount: totalAmount,
            count: totalCount,
            name: category.name || '未知类别',
            type: category.type,
            isBasicExpense: category.isBasicExpense
          };
        } else {
          categoryData[categoryId].amount = totalAmount;
          categoryData[categoryId].count = totalCount;
        }
        
        return { amount: totalAmount, count: totalCount };
      };
      
      // 对所有根类别执行汇总
      categories.forEach(cat => {
        if (!cat.parentId) {
          sumChildrenData(cat._id.toString());
        }
      });
      
      return categoryData;
    };
    
    // 根据时间周期处理基础消费
    const processBasicExpenses = (basicExpenses, period, startDate, endDate) => {
      // 如果没有基础消费，返回空对象
      if (!basicExpenses || basicExpenses.length === 0) {
        return {
          total: 0,
          count: 0,
          byCategory: {}
        };
      }

      // 按类别分组
      const byCategory = {};
      let totalAmount = 0;
      let totalCount = 0;
      
      // 处理每个基础消费
      basicExpenses.forEach(expense => {
        const catId = typeof expense.categoryId === 'object'
          ? expense.categoryId._id?.toString() || expense.categoryId.toString()
          : expense.categoryId?.toString();
          
        if (!catId) return;
        
        // 验证基础消费时间范围
        const expenseStart = new Date(expense.startDate);
        const expenseEnd = new Date(expense.endDate);
        
        // 计算此基础消费在查询时间段内有几个月生效
        const overlappingStart = new Date(Math.max(expenseStart.getTime(), startDate.getTime()));
        const overlappingEnd = new Date(Math.min(expenseEnd.getTime(), endDate.getTime()));
        
        // 计算重叠月数
        const monthsDiff = (overlappingEnd.getFullYear() - overlappingStart.getFullYear()) * 12 +
                           (overlappingEnd.getMonth() - overlappingStart.getMonth()) + 1;
        
        // 确保至少计算1个月（如果在同一个月内）
        const effectiveMonths = Math.max(1, monthsDiff);
        
        // 本次基础消费在查询区间内的总金额
        const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount) || 0;
        const effectiveAmount = amount * effectiveMonths;
        
        // 更新类别统计
        if (!byCategory[catId]) {
          const category = categoryMap.get(catId);
          byCategory[catId] = {
            amount: 0,
            count: 0,
            name: category ? category.name : '未知类别',
            type: category ? category.type : 'expense',
            isBasicExpense: true
          };
        }
        
        byCategory[catId].amount += effectiveAmount;
        byCategory[catId].count += effectiveMonths;
        
        // 更新总计
        totalAmount += effectiveAmount;
        totalCount += effectiveMonths;
      });
      
      return {
        total: totalAmount,
        count: totalCount,
        byCategory
      };
    };
    
    // 处理收入和支出数据
    const incomeByCategory = processCategoryData(incomeTransactions);
    const expenseByCategory = processCategoryData(expenseTransactions);
    const basicExpenseData = includeBasicExpense 
      ? processBasicExpenses(basicExpenses, period, startDate, endDate)
      : { total: 0, count: 0, byCategory: {} };
    
    // 计算总计（确保处理所有值为数字）
    const totalIncome = incomeTransactions.reduce((sum, t) => {
      const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
      return sum + amount;
    }, 0);
    
    const totalExpense = expenseTransactions.reduce((sum, t) => {
      const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
      return sum + amount;
    }, 0);
    
    // 构建周期标签
    let periodLabel: string;
    switch(period) {
      case 'year':
        periodLabel = `${year}年`;
        break;
      case 'quarter':
        periodLabel = `${year}年第${quarter}季度`;
        break;
      case 'month':
        periodLabel = `${year}年${month}月`;
        break;
    }
    
    // 添加月度数据处理逻辑（仅当查询年度或季度时）
    let monthlyData = [];
    if (period === 'year' || period === 'quarter') {
      monthlyData = generateMonthlyData(
        startDate, 
        endDate, 
        incomeTransactions, 
        expenseTransactions, 
        includeBasicExpense ? basicExpenses : []
      );
    }
    
    // 构建结果
    const result = {
      period: periodLabel,
      totalIncome,
      totalExpense: totalExpense + basicExpenseData.total,
      totalBasicExpense: basicExpenseData.total,
      balance: totalIncome - (totalExpense + basicExpenseData.total),
      incomeTransactionCount: incomeTransactions.length,
      expenseTransactionCount: expenseTransactions.length,
      basicExpenseCount: basicExpenseData.count,
      incomeByCategory,
      expenseByCategory,
      basicExpenseByCategory: basicExpenseData.byCategory,
      dateRange: {
        start: startDate,
        end: endDate
      },
      monthlyData
    };
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('获取报表数据错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '获取报表数据时发生错误',
    });
  }
});

// 添加一个新函数来处理月度数据
const generateMonthlyData = (startDate, endDate, incomeTransactions, expenseTransactions, basicExpenses) => {
  const monthlyData = [];
  
  // 确定要计算多少个月
  let currentDate = new Date(startDate);
  const lastDate = new Date(endDate);
  
  while (currentDate <= lastDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // JavaScript月份从0开始
    
    // 计算当月的开始和结束日期
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    // 过滤出当月的交易
    const monthIncomeTransactions = incomeTransactions.filter(t => {
      const date = new Date(t.transactionDate);
      return date >= monthStart && date <= monthEnd;
    });
    
    const monthExpenseTransactions = expenseTransactions.filter(t => {
      const date = new Date(t.transactionDate);
      return date >= monthStart && date <= monthEnd;
    });
    
    // 计算当月的收入和支出总额
    const monthIncome = monthIncomeTransactions.reduce((sum, t) => {
      const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
      return sum + amount;
    }, 0);
    
    const monthExpense = monthExpenseTransactions.reduce((sum, t) => {
      const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
      return sum + amount;
    }, 0);
    
    // 计算当月的基础消费
    let monthBasicExpense = 0;
    if (basicExpenses && basicExpenses.length > 0) {
      basicExpenses.forEach(expense => {
        const expenseStart = new Date(expense.startDate);
        const expenseEnd = new Date(expense.endDate);
        
        // 检查此基础消费在当月是否生效
        if (!(expenseEnd < monthStart || expenseStart > monthEnd)) {
          const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount) || 0;
          monthBasicExpense += amount;
        }
      });
    }
    
    // 添加当月数据
    monthlyData.push({
      period: `${year}-${month.toString().padStart(2, '0')}`,
      income: monthIncome,
      expense: monthExpense + monthBasicExpense,
      basicExpense: monthBasicExpense
    });
    
    // 移到下一个月
    currentDate = new Date(year, month, 1);
  }
  
  return monthlyData;
}; 