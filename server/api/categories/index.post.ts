import { defineEventHandler, readBody, createError } from 'h3';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';
import { z } from 'zod';

// 创建类别验证模式
const categorySchema = z.object({
  name: z.string().min(1, '类别名称是必需的'),
  parentId: z.string().nullable().optional(),
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
    
    const { name, parentId } = validationResult.data;
    
    // 如果有parentId，确保父类别存在
    let level = 1;
    let path = '';
    
    if (parentId) {
      const parentCategory = await Category.findById(parentId);
      
      if (!parentCategory) {
        throw createError({
          statusCode: 404,
          statusMessage: '父类别不存在',
        });
      }
      
      // 确保不超过最大层级
      if (parentCategory.level >= 3) {
        throw createError({
          statusCode: 400,
          statusMessage: '不能创建超过3层的类别',
        });
      }
      
      level = parentCategory.level + 1;
    }
    
    // 创建新类别
    const newCategory = new Category({
      name,
      parentId: parentId || null,
      level,
      path, // 路径会在保存前自动更新
    });
    
    await newCategory.save();
    
    return {
      success: true,
      data: newCategory,
    };
  } catch (error: any) {
    console.error('创建类别错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '创建类别时发生错误',
    });
  }
});