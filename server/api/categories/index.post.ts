import { defineEventHandler, readBody, createError } from 'h3';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';
import { z } from 'zod';

// 类别创建验证模式
const categorySchema = z.object({
  name: z.string().min(1, '类别名称是必需的'),
  parentId: z.string().nullable().optional(),
  type: z.enum(['income', 'expense'], { 
    errorMap: () => ({ message: '类型必须是收入(income)或支出(expense)' }) 
  }),
});

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取并验证请求体
    const body = await readBody(event);
    const validationResult = categorySchema.safeParse(body);
    
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: '验证失败',
        data: validationResult.error.format(),
      });
    }
    
    const { name, parentId, type } = validationResult.data;
    
    // 初始值
    let level = 1;
    let path = '';
    
    // 如果有父类别，检查并设置相关属性
    if (parentId) {
      const parentCategory = await Category.findById(parentId);
      
      if (!parentCategory) {
        throw createError({
          statusCode: 404,
          statusMessage: '父类别不存在',
        });
      }
      
      // 检查层级限制
      if (parentCategory.level >= 3) {
        throw createError({
          statusCode: 400,
          statusMessage: '最多支持3级分类',
        });
      }
      
      level = parentCategory.level + 1;
    }
    
    // 创建新类别
    const newCategory = new Category({
      name,
      parentId: parentId || null,
      level,
      path, // 将在保存前自动更新
      type,
    });
    
    // 保存到数据库
    await newCategory.save();
    
    return {
      success: true,
      data: newCategory,
    };
  } catch (error: any) {
    // 处理错误
    if (error.statusCode) {
      throw error; // 如果是已经格式化的错误，直接抛出
    }
    
    console.error('创建类别错误:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '创建类别时发生错误',
    });
  }
});