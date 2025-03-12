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
  [key: string]: any;
}

interface CategoryWithChildren extends Record<string, any> {
  _id: any;
  name: string;
  children: CategoryWithChildren[];
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
    let basicExpenses: any[] = [];
    if (includeBasicExpense) {
      basicExpenses = await BasicExpense.find({
        userId,
        isActive: true,
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
        children: []
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
            name: category ? category.name : '未知类别'
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
            name: category.name || '未知类别'
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
    const processBasicExpenses = (basicExpenses, period, year, month = null, quarter = null) => {
      // 如果没有基础消费，返回空对象
      if (!basicExpenses || basicExpenses.length === 0) {
        return {
          total: 0,
          count: 0,
          byCategory: {}
        };
      }

      // 计算总基础消费（按月）
      const monthlyTotal = basicExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      
      // 按类别分组
      const byCategory = {};
      basicExpenses.forEach(expense => {
        const catId = typeof expense.categoryId === 'object'
          ? expense.categoryId._id?.toString() || expense.categoryId.toString()
          : expense.categoryId?.toString();
          
        if (!catId) return;
        
        if (!byCategory[catId]) {
          const category = categoryMap.get(catId);
          byCategory[catId] = {
            amount: 0,
            count: 0,
            name: category ? category.name : '未知类别'
          };
        }
        
        const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount) || 0;
        byCategory[catId].amount += amount;
        byCategory[catId].count += 1;
      });
      
      // 根据周期类型确定乘数
      let multiplier = 1;
      
      switch (period) {
        case 'year':
          // 年度报表：所有12个月的基础消费
          multiplier = 12;
          break;
          
        case 'quarter':
          // 季度报表：3个月的基础消费
          multiplier = 3;
          break;
          
        case 'month':
          // 月度报表：1个月的基础消费
          multiplier = 1;
          break;
      }
      
      // 计算周期内总基础消费
      const periodTotal = monthlyTotal * multiplier;
      
      // 按相同比例调整每个类别的金额
      Object.keys(byCategory).forEach(catId => {
        byCategory[catId].amount *= multiplier;
      });
      
      return {
        total: periodTotal,
        count: basicExpenses.length * multiplier,
        byCategory
      };
    };
    
    // 处理收入和支出数据
    const incomeByCategory = processCategoryData(incomeTransactions);
    const expenseByCategory = processCategoryData(expenseTransactions);
    const basicExpenseData = includeBasicExpense
      ? processBasicExpenses(basicExpenses, period, year, month, quarter)
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
      }
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