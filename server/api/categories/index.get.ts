import { defineEventHandler, getQuery, createError } from 'h3';
import { Category } from '~/server/models/category';
import { connectToDatabase } from '~/server/utils/db';

export default defineEventHandler(async (event) => {
  try {
    // 连接数据库
    await connectToDatabase();
    
    // 获取查询参数
    const query = getQuery(event);
    const level = query.level ? parseInt(query.level as string) : undefined;
    const parentId = query.parentId as string;
    
    // 构建查询条件
    const filter: any = {};
    
    if (level !== undefined) {
      filter.level = level;
    }
    
    if (parentId) {
      filter.parentId = parentId;
    } else if (parentId === '') {
      // 如果parentId为空字符串，查询顶级类别
      filter.parentId = null;
    }
    
    // 按照名称升序查询类别列表
    const categories = await Category.find(filter).sort({ name: 1 });
    
    return {
      success: true,
      data: categories,
    };
  } catch (error: any) {
    console.error('获取类别列表错误:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '获取类别列表时发生错误',
    });
  }
});