import { defineEventHandler, readBody, createError } from 'h3';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';
import { z } from 'zod';

// 更新类别验证模式
const updateCategorySchema = z.object({
  name: z.string().min(1, '类别名称是必需的'),
});

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取类别ID
    const id = event.context.params?.id;
    
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: '类别ID是必需的',
      });
    }
    
    // 获取并验证请求体
    const body = await readBody(event);
    const validationResult = updateCategorySchema.safeParse(body);
    
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: '验证失败',
        data: validationResult.error.format(),
      });
    }
    
    const { name } = validationResult.data;
    
    // 查找并更新类别
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );
    
    if (!updatedCategory) {
      throw createError({
        statusCode: 404,
        statusMessage: '类别不存在',
      });
    }
    
    return {
      success: true,
      data: updatedCategory,
    };
  } catch (error: any) {
    console.error('更新类别错误:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: '更新类别时发生错误',
    });
  }
});