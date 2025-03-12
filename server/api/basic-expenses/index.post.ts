import { defineEventHandler, readBody, createError } from 'h3';
import { BasicExpense } from '~/server/models/basicExpense';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';
import { z } from 'zod';

// 基本消费验证模式
const basicExpenseSchema = z.object({
  userId: z.string().min(1, '用户ID是必需的'),
  categoryId: z.string().min(1, '类别ID是必需的'),
  amount: z.number().positive('金额必须为正数'),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  startDate: z.string().min(1, '开始日期是必需的'),
  endDate: z.string().min(1, '结束日期是必需的'),
});

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取并验证请求体
    const body = await readBody(event);
    const validationResult = basicExpenseSchema.safeParse(body);
    
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: '验证失败',
        data: validationResult.error.format(),
      });
    }
    
    const {
      userId,
      categoryId,
      amount,
      description,
      isActive,
      startDate,
      endDate,
    } = validationResult.data;
    
    // 验证类别是否存在
    const category = await Category.findById(categoryId);
    
    if (!category) {
      throw createError({
        statusCode: 404,
        statusMessage: '类别不存在',
      });
    }
    
    // 创建基础消费校验
    if (!categoryId || amount === undefined || !startDate || !endDate) {
      return {
        success: false,
        message: '缺少必要参数'
      };
    }

    // 验证日期格式
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime()) || startDateObj > endDateObj) {
      return {
        success: false,
        message: '日期格式无效或起始日期大于结束日期'
      };
    }
    
    // 创建新的基本消费配置
    const newBasicExpense = new BasicExpense({
      userId,
      categoryId,
      amount,
      description,
      isActive,
      startDate: startDateObj,
      endDate: endDateObj,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    await newBasicExpense.save();
    
    return {
      success: true,
      data: newBasicExpense,
    };
  } catch (error: any) {
    console.error('创建基本消费错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '创建基本消费时发生错误',
    });
  }
}); 